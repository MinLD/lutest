import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { assertPlaywrightBrowserPreflight } from "./playwright-browser-preflight";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";
import { captureRuntimeDomGeometry } from "./runtime-dom-geometry";
import { runtimeScanArtifactPaths, saveLatestRuntimeScan } from "./runtime-scan-artifacts";
import { resolveRuntimeScanLimits } from "./runtime-scan-limits";
import { RUNTIME_SCAN_SCHEMA_VERSION } from "./runtime-scan.schema";
import { assertExecutableRuntimeRouteTarget, resolveRuntimeTargetDiscovery } from "./runtime-scan-targets";
import { resolveRuntimeScanViewports, viewportSlug } from "./runtime-scan-viewports";

import type {
  RuntimeConsoleMessage,
  DomGeometry,
  RuntimeFailedResponse,
  RuntimeNetworkError,
  RuntimeRouteScanResult,
  RuntimeScanError,
  RuntimeScanRequest,
  RuntimeScanResult,
  RuntimeViewportResult,
} from "./playwright-scan.types";

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

const safeRouteName = (route: string, index: number, viewportName: string): string => {
  const normalized = route === "/" ? "root" : route.replace(/^\/+/, "");
  const slug = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-") || "root";
  const hash = crypto.createHash("sha1").update(route).digest("hex").slice(0, 8);
  return `${String(index + 1).padStart(3, "0")}-${slug}-${viewportName}-${hash}.png`;
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
  screenshotCount: routes.reduce((sum, route) => sum + route.viewportResults.filter((viewport) => viewport.screenshotPath).length, 0),
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
  const targetDiscovery = resolveRuntimeTargetDiscovery({
    routes: discoveredRoutes.routes,
    source: discoveredRoutes.source,
    reason: discoveredRoutes.reason,
    limits,
  });
  const scanRoutes = targetDiscovery.routes;
  const routeDiscovery = {
    routes: targetDiscovery.routes,
    source: targetDiscovery.source,
    mode: targetDiscovery.mode,
    reason: targetDiscovery.reason,
  };
  const targets = targetDiscovery.targets;

  await assertPlaywrightBrowserPreflight();
  const scanId = `runtime_${nowId()}`;
  const artifactPaths = runtimeScanArtifactPaths({ projectRoot, scanId });
  const artifactRoot = artifactPaths.rootDir;
  const screenshotsDir = artifactPaths.screenshotsDir;
  const resultPath = artifactPaths.latestResultPath;
  await fs.mkdir(screenshotsDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const viewports = resolveRuntimeScanViewports(request.viewport);
  const routeResults: RuntimeRouteScanResult[] = [];
  let browser: Browser | null = null;
  let screenshotIndex = 0;

  try {
    browser = await chromium.launch({ headless: request.headless ?? true });

    for (const [index, target] of targets.entries()) {
      const routeTarget = assertExecutableRuntimeRouteTarget(target);
      const route = routeTarget.route;
      const url = routeUrl(baseUrl, route);
      const consoleMessages: RuntimeConsoleMessage[] = [];
      const pageErrors: string[] = [];
      const networkErrors: RuntimeNetworkError[] = [];
      const failedResponses: RuntimeFailedResponse[] = [];
      const started = Date.now();
      let status: number | undefined;
      let error: RuntimeScanError | undefined;
      let screenshotPath: string | undefined;
      let screenshotError: string | undefined;
      const viewportResults: RuntimeViewportResult[] = [];

      for (const viewport of viewports) {
        let context: BrowserContext | null = null;
        let page: Page | null = null;
        let viewportStatus: number | undefined;
        let viewportError: RuntimeScanError | undefined;
        let viewportScreenshotPath: string | undefined;
        let viewportScreenshotError: string | undefined;
        let domGeometry: DomGeometry | undefined;

        try {
          context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
          page = await context.newPage();
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
            viewportStatus = response?.status();
            status ??= viewportStatus;
            await page.waitForLoadState("networkidle", { timeout: Math.min(limits.routeTimeoutMs, 5_000) }).catch(() => undefined);
          } catch (cause) {
            viewportError = toRuntimeError("ROUTE_LOAD_FAILED", errorMessage(cause), { targetId: target.id, route });
          }

          if (!viewportError && screenshotIndex < limits.maxScreenshots) {
            const candidateScreenshotPath = path.join(screenshotsDir, safeRouteName(route, index, viewportSlug(viewport)));
            assertInside(projectRoot, candidateScreenshotPath);
            try {
              await page.screenshot({ path: candidateScreenshotPath, fullPage: true });
              viewportScreenshotPath = candidateScreenshotPath;
              screenshotPath ??= candidateScreenshotPath;
              screenshotIndex += 1;
            } catch (cause) {
              viewportScreenshotError = errorMessage(cause);
              screenshotError ??= viewportScreenshotError;
            }
          }

          if (!viewportError) {
            try {
              domGeometry = await captureRuntimeDomGeometry({ page, viewport, limits });
            } catch (cause) {
              viewportError = toRuntimeError("DOM_GEOMETRY_CAPTURE_FAILED", errorMessage(cause), { targetId: target.id, route });
            }
          }
        } finally {
          await closeQuietly(page);
          await closeQuietly(context);
        }

        error ??= viewportError;
        viewportResults.push({
          viewport,
          screenshotPath: viewportScreenshotPath,
          screenshotError: viewportScreenshotError,
          ...(domGeometry ? { domGeometry } : {}),
          layoutIssues: [],
        });
      }

      routeResults.push({
        targetId: target.id,
        target: routeTarget,
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
        viewportResults,
        durationMs: Date.now() - started,
      });
    }
  } finally {
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
    targetDiscovery: {
      mode: targetDiscovery.mode,
      targetIds: targets.map((target) => target.id),
      reason: targetDiscovery.reason,
    },
    routeDiscovery,
  };

  await saveLatestRuntimeScan(result);
  return result;
};
