import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { assertPlaywrightBrowserPreflight } from "./playwright-browser-preflight";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";
import { resolveRuntimeScanLimits } from "./runtime-scan-limits";
import { RUNTIME_SCAN_SCHEMA_VERSION, validateRuntimeScanResult } from "./runtime-scan.schema";
import type {
  RuntimeConsoleMessage,
  RuntimeFailedResponse,
  RuntimeNetworkError,
  RuntimeRouteScanResult,
  RuntimeRouteTarget,
  RuntimeScanError,
  RuntimeScanRequest,
  RuntimeScanResult,
} from "./playwright-scan.types";

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const BASE_URL_ERROR = "Runtime scan baseUrl must be a local HTTP(S) URL";

const nowId = (): string => new Date().toISOString().replace(/[:.]/g, "-");

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const toRuntimeError = (code: string, message: string, input?: { targetId?: string; route?: string }): RuntimeScanError => ({
  code,
  message,
  targetId: input?.targetId,
  route: input?.route,
});

const assertInside = (parent: string, child: string): void => {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Runtime scan artifact path must stay inside project root");
  }
};

const validateBaseUrl = (baseUrl: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(BASE_URL_ERROR);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(BASE_URL_ERROR);
  }
  if (parsed.username || parsed.password) {
    throw new Error(BASE_URL_ERROR);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(BASE_URL_ERROR);
  }
  return parsed;
};

const safeRouteName = (route: string, index: number): string => {
  const normalized = route === "/" ? "root" : route.replace(/^\/+/, "");
  const slug = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-") || "root";
  const hash = crypto.createHash("sha1").update(route).digest("hex").slice(0, 8);
  return `${String(index + 1).padStart(3, "0")}-${slug}-${hash}.png`;
};

const routeUrl = (baseUrl: URL, route: string): string => {
  const safeRoute = route.replace(/^\/+/, "");
  const url = new URL(safeRoute, baseUrl.href.endsWith("/") ? baseUrl.href : `${baseUrl.href}/`);
  if (url.origin !== baseUrl.origin) {
    throw new Error("Runtime scan route must stay under baseUrl");
  }
  return url.toString();
};

const summarize = (routes: RuntimeRouteScanResult[]) => ({
  routeCount: routes.length,
  targetCount: routes.length,
  consoleMessageCount: routes.reduce((sum, route) => sum + route.consoleMessages.length, 0),
  pageErrorCount: routes.reduce((sum, route) => sum + route.pageErrors.length, 0),
  networkErrorCount: routes.reduce((sum, route) => sum + route.networkErrors.length, 0),
  failedResponseCount: routes.reduce((sum, route) => sum + route.failedResponses.length, 0),
  screenshotCount: routes.filter((route) => route.screenshotPath).length,
  errorCount: routes.filter((route) => route.error).length,
});

const closeQuietly = async (target: Browser | BrowserContext | Page | null): Promise<void> => {
  try {
    await target?.close();
  } catch {
    // ignore close failure; scan result already captured useful errors
  }
};

export const runPlaywrightRuntimeScan = async (
  request: RuntimeScanRequest,
): Promise<RuntimeScanResult> => {
  const baseUrl = validateBaseUrl(request.baseUrl);
  const policy = await pathPolicyService.assertProjectRoot(request.projectRoot);
  if (!policy.ok) throw new Error(policy.message);

  const projectRoot = policy.rootDir;
  const limits = resolveRuntimeScanLimits({ routeTimeoutMs: request.timeoutMs });
  const discoveredRoutes = await discoverRuntimeScanRoutes({
    projectRoot,
    routes: request.routes,
  });
  const scanRoutes = discoveredRoutes.routes.slice(0, limits.maxRoutes);
  const routeDiscovery = {
    ...discoveredRoutes,
    routes: scanRoutes,
    reason: discoveredRoutes.routes.length > scanRoutes.length
      ? `${discoveredRoutes.reason}; capped by maxRoutes=${limits.maxRoutes}`
      : discoveredRoutes.reason,
  };
  const targets: RuntimeRouteTarget[] = scanRoutes.slice(0, limits.maxTargets).map((route, index) => ({
    id: `route:${index + 1}`,
    kind: "route",
    route,
  }));

  await assertPlaywrightBrowserPreflight();
  const scanId = `runtime_${nowId()}`;
  const artifactRoot = path.join(projectRoot, ".lutest", "runtime-scans", scanId);
  const screenshotsDir = path.join(artifactRoot, "screenshots");
  const resultPath = path.join(artifactRoot, "runtime-scan.json");
  assertInside(projectRoot, artifactRoot);
  assertInside(projectRoot, screenshotsDir);
  assertInside(projectRoot, resultPath);
  await fs.mkdir(screenshotsDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const viewport = request.viewport ?? DEFAULT_VIEWPORT;
  const routeResults: RuntimeRouteScanResult[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: request.headless ?? true });
    context = await browser.newContext({ viewport });

    for (const [index, target] of targets.entries()) {
      const page = await context.newPage();
      const route = target.route;
      const url = routeUrl(baseUrl, route);
      const candidateScreenshotPath = path.join(screenshotsDir, safeRouteName(route, index));
      assertInside(projectRoot, candidateScreenshotPath);
      const consoleMessages: RuntimeConsoleMessage[] = [];
      const pageErrors: string[] = [];
      const networkErrors: RuntimeNetworkError[] = [];
      const failedResponses: RuntimeFailedResponse[] = [];
      const started = Date.now();
      let status: number | undefined;
      let error: RuntimeScanError | undefined;
      let screenshotPath: string | undefined;
      let screenshotError: string | undefined;

      page.on("console", (message) => {
        if (message.type() !== "warning" && message.type() !== "error") return;
        const location = message.location();
        consoleMessages.push({
          type: message.type(),
          text: message.text(),
          location: location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
        });
      });
      page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
      page.on("requestfailed", (failedRequest) => {
        networkErrors.push({
          url: failedRequest.url(),
          method: failedRequest.method(),
          failureText: failedRequest.failure()?.errorText,
        });
      });
      page.on("response", (response) => {
        if (response.status() < 400) return;
        failedResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      });

      try {
        const response = await page.goto(url, { waitUntil: "load", timeout: limits.routeTimeoutMs });
        status = response?.status();
        await page.waitForLoadState("networkidle", { timeout: Math.min(limits.routeTimeoutMs, 5_000) }).catch(() => undefined);
      } catch (cause) {
        error = toRuntimeError("ROUTE_LOAD_FAILED", errorMessage(cause), { targetId: target.id, route });
      }

      if (!error && index < limits.maxScreenshots) {
        try {
          await page.screenshot({ path: candidateScreenshotPath, fullPage: true });
          screenshotPath = candidateScreenshotPath;
        } catch (cause) {
          screenshotError = errorMessage(cause);
        }
      }

      routeResults.push({
        targetId: target.id,
        target,
        route,
        url,
        status,
        screenshotPath,
        screenshotError,
        error,
        consoleMessages,
        pageErrors,
        networkErrors,
        failedResponses,
        viewportResults: [{ viewport, screenshotPath, screenshotError, layoutIssues: [] }],
        durationMs: Date.now() - started,
      });
      await closeQuietly(page);
    }
  } finally {
    await closeQuietly(context);
    await closeQuietly(browser);
  }

  const generatedAt = new Date().toISOString();
  const result: RuntimeScanResult = {
    schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
    scanId,
    generatedAt,
    projectRoot,
    selectedRoot: projectRoot,
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    startedAt,
    finishedAt: generatedAt,
    targets,
    routes: routeResults,
    limits,
    errors: routeResults.flatMap((route) => route.error ? [route.error] : []),
    summary: summarize(routeResults),
    artifacts: {
      rootDir: artifactRoot,
      screenshotsDir,
      resultPath,
    },
    routeDiscovery,
  };

  validateRuntimeScanResult(result);
  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return result;
};
