import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";
import type {
  RuntimeConsoleMessage,
  RuntimeFailedResponse,
  RuntimeNetworkError,
  RuntimeRouteScanResult,
  RuntimeScanRequest,
  RuntimeScanResult,
} from "./playwright-scan.types";

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const DEFAULT_TIMEOUT_MS = Number(process.env.WORKER_TIMEOUT ?? 15_000);

const nowId = (): string => new Date().toISOString().replace(/[:.]/g, "-");

const assertInside = (parent: string, child: string): void => {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Runtime scan artifact path must stay inside project root");
  }
};

const safeRouteName = (route: string): string => {
  const normalized = route === "/" ? "root" : route.replace(/^\/+/, "");
  return `${normalized.replace(/[^a-zA-Z0-9._-]+/g, "-") || "root"}.png`;
};

const routeUrl = (baseUrl: string, route: string): string => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const relative = route.replace(/^\/+/, "");
  return new URL(relative, base).toString();
};

const summarize = (routes: RuntimeRouteScanResult[]) => ({
  routeCount: routes.length,
  consoleMessageCount: routes.reduce((sum, route) => sum + route.consoleMessages.length, 0),
  pageErrorCount: routes.reduce((sum, route) => sum + route.pageErrors.length, 0),
  networkErrorCount: routes.reduce((sum, route) => sum + route.networkErrors.length, 0),
  failedResponseCount: routes.reduce((sum, route) => sum + route.failedResponses.length, 0),
  screenshotCount: routes.filter((route) => route.screenshotPath).length,
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
  const policy = await pathPolicyService.assertProjectRoot(request.projectRoot, {
    allowedRoot: request.projectRoot,
  });
  if (!policy.ok) throw new Error(policy.message);

  const projectRoot = policy.rootDir;
  const routeDiscovery = await discoverRuntimeScanRoutes({
    projectRoot,
    routes: request.routes,
  });
  const scanId = `runtime_${nowId()}`;
  const artifactRoot = path.join(projectRoot, ".lutest", "runtime-scans", scanId);
  const screenshotsDir = path.join(artifactRoot, "screenshots");
  const resultPath = path.join(artifactRoot, "runtime-scan.json");
  assertInside(projectRoot, artifactRoot);
  assertInside(projectRoot, screenshotsDir);
  assertInside(projectRoot, resultPath);
  await fs.mkdir(screenshotsDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const viewport = request.viewport ?? DEFAULT_VIEWPORT;
  const routeResults: RuntimeRouteScanResult[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: request.headless ?? true });
    context = await browser.newContext({ viewport });

    for (const route of routeDiscovery.routes) {
      const page = await context.newPage();
      const url = routeUrl(request.baseUrl, route);
      const screenshotPath = path.join(screenshotsDir, safeRouteName(route));
      assertInside(projectRoot, screenshotPath);
      const consoleMessages: RuntimeConsoleMessage[] = [];
      const pageErrors: string[] = [];
      const networkErrors: RuntimeNetworkError[] = [];
      const failedResponses: RuntimeFailedResponse[] = [];
      const started = Date.now();
      let status: number | undefined;

      page.on("console", (message) => {
        if (message.type() !== "warning" && message.type() !== "error") return;
        const location = message.location();
        consoleMessages.push({
          type: message.type(),
          text: message.text(),
          location: location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
        });
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
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
        const response = await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
        status = response?.status();
        await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 5_000) }).catch(() => undefined);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } finally {
        routeResults.push({
          route,
          url,
          status,
          screenshotPath,
          consoleMessages,
          pageErrors,
          networkErrors,
          failedResponses,
          durationMs: Date.now() - started,
        });
        await closeQuietly(page);
      }
    }
  } finally {
    await closeQuietly(context);
    await closeQuietly(browser);
  }

  const result: RuntimeScanResult = {
    scanId,
    projectRoot,
    baseUrl: request.baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    routes: routeResults,
    summary: summarize(routeResults),
    artifacts: {
      rootDir: artifactRoot,
      screenshotsDir,
      resultPath,
    },
    routeDiscovery,
  };

  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return result;
};
