import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { assertPlaywrightBrowserPreflight } from "./playwright-browser-preflight";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";
import { captureRuntimeDomGeometry } from "./runtime-dom-geometry";
import {
  clickRuntimeInteractionCandidate,
  discoverRuntimeInteractionCandidates,
  runtimeInteractionIssueDedupKey,
  runtimeInteractionStateDedupKey,
} from "./runtime-interaction-discovery";
import { detectRuntimeLayoutIssues } from "./runtime-layout-issue-detector";
import { detectRuntimeReadabilityIssues } from "./runtime-readability-issue-detector";
import { RUNTIME_INTERACTION_SETTLE_TIMEOUT_MS, RUNTIME_ROUTE_NETWORK_IDLE_TIMEOUT_MS, resolveRuntimeScanLimits } from "./runtime-scan-limits";
import { manualTargetRoute, manualTargetSteps, redactRuntimeTarget, runManualFlowSteps, type RuntimeManualStepResult } from "./runtime-manual-flow";
import { runtimeScanArtifactPaths, saveLatestRuntimeScan } from "./runtime-scan-artifacts";
import { RUNTIME_SCAN_SCHEMA_VERSION } from "./runtime-scan.schema";
import { captureRuntimeScreenshot } from "./runtime-screenshot-capture";
import { resolveRuntimeTargetDiscovery } from "./runtime-scan-targets";
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
  RuntimeSkippedInteraction,
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

const safeRouteName = (route: string, index: number, viewportName: string, stateIndex: number): string => {
  const normalized = route === "/" ? "root" : route.replace(/^\/+/, "");
  const slug = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-") || "root";
  const hash = crypto.createHash("sha1").update(route).digest("hex").slice(0, 8);
  return `${String(index + 1).padStart(3, "0")}-${slug}-${viewportName}-state-${stateIndex}-${hash}.png`;
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
  const viewports = resolveRuntimeScanViewports(request.viewport);
  const resolvedLimits = resolveRuntimeScanLimits(
    {
      ...(typeof request.timeoutMs === "number" ? { routeTimeoutMs: request.timeoutMs } : {}),
      ...(request.interactionDiscovery?.maxInteractionsPerRoute !== undefined ? { maxInteractionsPerRoute: request.interactionDiscovery.maxInteractionsPerRoute } : {}),
      ...(request.interactionDiscovery?.maxStatesPerRoute !== undefined ? { maxStatesPerRoute: request.interactionDiscovery.maxStatesPerRoute } : {}),
      ...(request.interactionDiscovery?.timeoutMs !== undefined ? { interactionDiscoveryTimeoutMs: request.interactionDiscovery.timeoutMs } : {}),
    },
  );
  const limits = {
    ...resolvedLimits,
    maxInteractionsPerRoute: request.interactionDiscovery?.maxInteractionsPerRoute
      ?? Math.max(resolvedLimits.maxInteractionsPerRoute, (resolvedLimits.maxStatesPerRoute - 1) * viewports.length),
  };
  const discoveredRoutes = await discoverRuntimeScanRoutes({
    projectRoot,
    routes: request.routes,
  });
  const targetDiscovery = resolveRuntimeTargetDiscovery({
    routes: discoveredRoutes.routes,
    customTargets: request.targets,
    source: discoveredRoutes.source,
    reason: request.targets?.length ? "Custom runtime targets provided by internal request" : discoveredRoutes.reason,
    limits,
  });
  const artifactTargets = targetDiscovery.targets.map(redactRuntimeTarget);
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
  const routeResults: RuntimeRouteScanResult[] = [];
  let browser: Browser | null = null;
  const scanDeadline = Date.now() + limits.scanTimeoutMs;

  try {
    browser = await chromium.launch({ headless: request.headless ?? true });

    for (const [index, target] of targets.entries()) {
      if (Date.now() >= scanDeadline) break;
      const route = manualTargetRoute(target);
      const manualSteps = manualTargetSteps(target);
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
      const executionSteps: RuntimeManualStepResult[] = [];
      let routeInteractionCount = 0;
      const routeDiscoveredLabels = new Set<string>();

      for (const viewport of viewports) {
        if (Date.now() >= scanDeadline) {
          error ??= toRuntimeError("RUNTIME_SCAN_TIMEOUT", "Runtime scan reached its total time limit.", { targetId: target.id, route });
          break;
        }
        let context: BrowserContext | null = null;
        let page: Page | null = null;
        let viewportStatus: number | undefined;
        let viewportError: RuntimeScanError | undefined;
        const capturedStates: RuntimeViewportResult[] = [];
        const viewportConsoleMessages: RuntimeConsoleMessage[] = [];
        const viewportPageErrors: string[] = [];
        const viewportNetworkErrors: RuntimeNetworkError[] = [];
        const viewportFailedResponses: RuntimeFailedResponse[] = [];

        try {
          context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, storageState: request.storageStatePath });
          page = await context.newPage();
          page.on("console", (message) => {
            if (message.type() !== "warning" && message.type() !== "error") return;
            const location = message.location();
            const consoleMessage = {
              type: message.type(),
              text: message.text(),
              location: location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
            };
            viewportConsoleMessages.push(consoleMessage);
            consoleMessages.push(consoleMessage);
          });
          page.on("pageerror", (pageError) => {
            viewportPageErrors.push(pageError.message);
            pageErrors.push(pageError.message);
          });
          page.on("requestfailed", (failedRequest) => {
            const networkError = {
              url: failedRequest.url(),
              method: failedRequest.method(),
              failureText: failedRequest.failure()?.errorText,
            };
            viewportNetworkErrors.push(networkError);
            networkErrors.push(networkError);
          });
          page.on("response", (response) => {
            if (response.status() < 400) return;
            const failedResponse = {
              url: response.url(),
              status: response.status(),
              statusText: response.statusText(),
            };
            viewportFailedResponses.push(failedResponse);
            failedResponses.push(failedResponse);
          });

          try {
            const remainingScanMs = Math.max(1, scanDeadline - Date.now());
            const routeTimeoutMs = Math.min(limits.routeTimeoutMs, remainingScanMs);
            const response = await page.goto(url, { waitUntil: "load", timeout: routeTimeoutMs });
            viewportStatus = response?.status();
            status ??= viewportStatus;
            await page.waitForLoadState("networkidle", { timeout: Math.min(limits.routeTimeoutMs, RUNTIME_ROUTE_NETWORK_IDLE_TIMEOUT_MS) }).catch(() => undefined);
            if (manualSteps.length > 0) {
              const stepResults = await runManualFlowSteps({
                page,
                steps: manualSteps,
                routeUrl: (nextRoute) => routeUrl(baseUrl, nextRoute),
                timeoutMs: routeTimeoutMs,
              });
              executionSteps.push(...stepResults);
              const failedStep = stepResults.find((step) => step.status === "failed");
              if (failedStep) viewportError = toRuntimeError("MANUAL_FLOW_STEP_FAILED", failedStep.message ?? "Manual flow step failed", { targetId: target.id, route });
            }
          } catch (cause) {
            viewportError = toRuntimeError("ROUTE_LOAD_FAILED", errorMessage(cause), { targetId: target.id, route });
          }

          if (!viewportError && page) {
            const activePage = page;
            const stateKeys = new Set<string>();
            const issueKeys = new Set<string>();
            const captureState = async (input: {
              stateLabel: string;
              interactionSource?: RuntimeViewportResult["interactionSource"];
              skippedInteractions?: RuntimeSkippedInteraction[];
            }): Promise<"captured" | "duplicate"> => {
              let stateGeometry: DomGeometry;
              try {
                stateGeometry = await captureRuntimeDomGeometry({ page: activePage, viewport, limits });
              } catch (cause) {
                viewportError = toRuntimeError("DOM_GEOMETRY_CAPTURE_FAILED", errorMessage(cause), { targetId: target.id, route });
                return "duplicate";
              }
              const stateDedupKey = runtimeInteractionStateDedupKey(stateGeometry);
              if (stateKeys.has(stateDedupKey)) return "duplicate";
              stateKeys.add(stateDedupKey);
              let stateScreenshotPath: string | undefined;
              let stateScreenshotError: string | undefined;
              const candidateScreenshotPath = path.join(screenshotsDir, safeRouteName(route, index, viewportSlug(viewport), capturedStates.length + 1));
              assertInside(projectRoot, candidateScreenshotPath);
              try {
                await captureRuntimeScreenshot({ page: activePage, viewport, outputPath: candidateScreenshotPath });
                stateScreenshotPath = candidateScreenshotPath;
                screenshotPath ??= candidateScreenshotPath;
              } catch (cause) {
                stateScreenshotError = errorMessage(cause);
                screenshotError ??= stateScreenshotError;
              }
              const issueInput = {
                scanTargetId: target.id,
                stateId: stateDedupKey,
                route,
                viewport,
                domGeometry: stateGeometry,
                screenshotPath: stateScreenshotPath,
              };
              const detectedIssues = [
                ...detectRuntimeLayoutIssues(issueInput),
                ...detectRuntimeReadabilityIssues(issueInput),
              ].filter((issue) => {
                const key = runtimeInteractionIssueDedupKey({
                  type: issue.type,
                  selector: issue.evidence.selectorHint,
                  viewport: issue.viewport,
                  boundingBox: issue.evidence.boundingBox,
                  relatedBoundingBox: issue.evidence.relatedBoundingBox,
                });
                if (issueKeys.has(key)) return false;
                issueKeys.add(key);
                return true;
              });
              capturedStates.push({
                viewport,
                stateId: stateDedupKey,
                stateLabel: input.stateLabel,
                stateDedupKey,
                interactionSource: input.interactionSource,
                skippedInteractions: input.skippedInteractions,
                screenshotPath: stateScreenshotPath,
                screenshotError: stateScreenshotError,
                domGeometry: stateGeometry,
                layoutIssues: detectedIssues,
                consoleMessages: capturedStates.length === 0 ? viewportConsoleMessages : [],
                pageErrors: capturedStates.length === 0 ? viewportPageErrors : [],
                networkErrors: capturedStates.length === 0 ? viewportNetworkErrors : [],
                failedResponses: capturedStates.length === 0 ? viewportFailedResponses : [],
              });
              return "captured";
            };

            const baselineLabel = target.kind === "route" ? "baseline" : target.name;
            await captureState({ stateLabel: baselineLabel });
            const baseline = capturedStates[0];
            if (request.interactionDiscovery?.enabled && target.kind === "route" && baseline) {
              const discoveryDeadline = Math.min(scanDeadline, Date.now() + limits.interactionDiscoveryTimeoutMs);
              const discovery = await discoverRuntimeInteractionCandidates(activePage);
              const skipped = [...discovery.skipped];
              baseline.skippedInteractions = skipped;
              for (const [candidateIndex, candidate] of discovery.candidates.entries()) {
                const stateLimitReached = !routeDiscoveredLabels.has(candidate.label) && routeDiscoveredLabels.size + 1 >= limits.maxStatesPerRoute;
                const interactionLimitReached = routeInteractionCount >= limits.maxInteractionsPerRoute;
                const timeLimitReached = Date.now() >= discoveryDeadline;
                if (stateLimitReached || interactionLimitReached || timeLimitReached) {
                  for (const remaining of discovery.candidates.slice(candidateIndex)) {
                    skipped.push({ candidateId: remaining.candidateId, kind: remaining.kind, label: remaining.label, reason: "limit-reached" });
                  }
                  break;
                }
                try {
                  await activePage.goto(url, { waitUntil: "load", timeout: Math.min(limits.routeTimeoutMs, Math.max(1, discoveryDeadline - Date.now())) });
                  await activePage.waitForLoadState("networkidle", { timeout: Math.min(RUNTIME_INTERACTION_SETTLE_TIMEOUT_MS, Math.max(1, discoveryDeadline - Date.now())) }).catch(() => undefined);
                  routeInteractionCount += 1;
                  const clickResult = await clickRuntimeInteractionCandidate({
                    page: activePage,
                    candidate,
                    expectedUrl: url,
                    timeoutMs: Math.min(RUNTIME_INTERACTION_SETTLE_TIMEOUT_MS, Math.max(1, discoveryDeadline - Date.now())),
                  });
                  if (clickResult !== "clicked") {
                    skipped.push({ candidateId: candidate.candidateId, kind: candidate.kind, label: candidate.label, reason: clickResult });
                    continue;
                  }
                  const captureResult = await captureState({
                    stateLabel: `${candidate.kind === "tab" ? "after click" : "after open"} "${candidate.label}"`,
                    interactionSource: {
                      candidateId: candidate.candidateId,
                      kind: candidate.kind,
                      label: candidate.label,
                      action: "click",
                    },
                  });
                  if (captureResult === "duplicate") skipped.push({ candidateId: candidate.candidateId, kind: candidate.kind, label: candidate.label, reason: "duplicate-state" });
                  else routeDiscoveredLabels.add(candidate.label);
                } catch {
                  skipped.push({ candidateId: candidate.candidateId, kind: candidate.kind, label: candidate.label, reason: "unsafe-candidate" });
                }
              }
              // ponytail: R8.7 explores one safe click from a reloaded baseline; add bounded action chains only with a separate risk model.
            }
          }
        } finally {
          await closeQuietly(page);
          await closeQuietly(context);
        }

        error ??= viewportError;
        if (capturedStates.length > 0) viewportResults.push(...capturedStates);
        else viewportResults.push({
          viewport,
          stateId: "state_failed",
          stateLabel: "baseline",
          stateDedupKey: "state_failed",
          error: viewportError,
          consoleMessages: viewportConsoleMessages,
          pageErrors: viewportPageErrors,
          networkErrors: viewportNetworkErrors,
          failedResponses: viewportFailedResponses,
          layoutIssues: [],
        });
      }

      routeResults.push({
        targetId: target.id,
        target: redactRuntimeTarget(target),
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
        ...(executionSteps.length ? { executionSteps } : {}),
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
    targets: artifactTargets,
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
      targetIds: artifactTargets.map((target) => target.id),
      reason: targetDiscovery.reason,
    },
    routeDiscovery,
  };

  await saveLatestRuntimeScan(result);
  return result;
};
