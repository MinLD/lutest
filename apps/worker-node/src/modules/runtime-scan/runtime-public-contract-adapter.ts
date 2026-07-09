import type {
  RuntimeScanRequest as PublicRuntimeScanRequest,
  RuntimeScanResult as PublicRuntimeScanResult,
  RuntimeScanTarget as PublicRuntimeScanTarget,
  RuntimeScanError as PublicRuntimeScanError,
  RuntimeErrorCode,
  RuntimeResultFlowStep,
  RuntimeResultTarget,
  RuntimeTargetResult as PublicRuntimeTargetResult,
} from "@lutest/contracts";
import { validateRuntimeScanResult } from "@lutest/contracts";
import type {
  RuntimeFlowStep,
  RuntimeScanRequest as InternalRuntimeScanRequest,
  RuntimeScanResult as InternalRuntimeScanResult,
  RuntimeScanTarget as InternalRuntimeScanTarget,
} from "./playwright-scan.types";

export class RuntimePublicContractAdapterError extends Error {
  constructor(
    readonly code: "CONFIG_ERROR" | "RUNTIME_SCAN_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "RuntimePublicContractAdapterError";
  }
}

const redactStep = (step: RuntimeFlowStep): RuntimeResultFlowStep =>
  step.kind === "fill" ? { kind: "fill", selector: step.selector, redacted: true, valueSource: step.valueFromEnv ? "env" : "direct", valueFromEnv: step.valueFromEnv } : { ...step };

const mapTarget = (target: PublicRuntimeScanTarget): InternalRuntimeScanTarget => {
  if (target.kind === "route") return { id: target.id, kind: "route", route: target.route };
  if (target.kind === "state") return { id: target.id, kind: "state", name: target.name ?? target.id, route: target.route, steps: target.steps.map((step) => ({ ...step })) as RuntimeFlowStep[] };
  return { id: target.id, kind: "flow", name: target.name ?? target.id, route: target.route, steps: target.steps.map((step) => ({ ...step })) as RuntimeFlowStep[] };
};

export const mapPublicRuntimeScanRequest = (input: {
  projectRoot: string;
  request: PublicRuntimeScanRequest;
}): InternalRuntimeScanRequest => ({
  projectRoot: input.projectRoot,
  baseUrl: input.request.baseUrl,
  routes: input.request.discoveryMode === "all-routes" ? undefined : input.request.routes ? [...input.request.routes] : undefined,
  targets: input.request.discoveryMode === "all-routes" || input.request.discoveryMode === "selected-routes" ? undefined : input.request.targets?.map(mapTarget),
  discoveryMode: input.request.discoveryMode,
  viewportPreset: input.request.viewportPreset ?? "default",
});

export const mapRuntimeIntegrationErrorCode = (code: string | undefined): RuntimeErrorCode => {
  if (code === "CONFIG_ERROR" || code === "PATH_NOT_ALLOWED" || code === "BASE_URL_NOT_LOCAL" || code === "ARTIFACT_WRITE_ERROR" || code === "RUNTIME_SCAN_FAILED") return code;
  if (code === "PLAYWRIGHT_BROWSER_MISSING" || code === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED") return code;
  if (code === "MANUAL_FLOW_STEP_FAILED" || code === "TARGET_EXECUTION_ERROR" || code === "RUNTIME_FLOW_ENV_VALUE_MISSING" || code === "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED") return "TARGET_EXECUTION_ERROR";
  if (code === "ROUTE_DISCOVERY_ERROR") return "ROUTE_DISCOVERY_ERROR";
  if (code === "ROUTE_LOAD_FAILED" || code === "ROUTE_SCAN_ERROR" || code === "SCREENSHOT_CAPTURE_FAILED" || code === "DOM_GEOMETRY_CAPTURE_FAILED") return "ROUTE_SCAN_ERROR";
  if (code === "RUNTIME_SCAN_ARTIFACT_INVALID" || code === "RUNTIME_SCAN_ARTIFACT_MALFORMED" || code === "RUNTIME_SCAN_ARTIFACT_IO") return "ARTIFACT_WRITE_ERROR";
  if (code === "RUNTIME_BASE_URL_NOT_ALLOWED") return "BASE_URL_NOT_LOCAL";
  return "RUNTIME_SCAN_FAILED";
};

const mapError = (error: { code?: string; message?: string; targetId?: string } | undefined): PublicRuntimeScanError | undefined => {
  if (!error) return undefined;
  return {
    code: mapErrorCode(error.code),
    message: error.message || "Runtime scan failed.",
    targetId: error.targetId,
  };
};

const mapErrorCode = mapRuntimeIntegrationErrorCode;

const targetName = (target: InternalRuntimeScanTarget): string | undefined =>
  target.kind === "state" || target.kind === "flow" ? target.name : undefined;

export const mapInternalRuntimeScanResult = (result: InternalRuntimeScanResult): PublicRuntimeScanResult => {
  const targetResults: PublicRuntimeTargetResult[] = result.routes.map((routeResult) => {
    const routeError = mapError(routeResult.error);
    const stepErrors = (routeResult.executionSteps ?? [])
      .filter((step) => step.status === "failed")
      .map((step) => ({ code: mapErrorCode(step.code), message: step.message ?? "Runtime step failed.", targetId: routeResult.targetId }));
    const targetErrors = [...(routeError ? [routeError] : []), ...stepErrors];
    const hasViewportError = routeResult.viewportResults.some((viewport) => Boolean(viewport.error));
    const hasStepError = stepErrors.length > 0;
    const hasTargetError = Boolean(routeError) || hasViewportError || hasStepError;
    const hasLayoutIssues = routeResult.viewportResults.some((viewport) => viewport.layoutIssues.length > 0);
    return {
      scanTargetId: routeResult.targetId,
      kind: routeResult.target.kind,
      route: routeResult.route,
      name: targetName(routeResult.target),
      status: hasTargetError ? "failed" : hasLayoutIssues ? "warning" : "passed",
      viewportResults: routeResult.viewportResults.map((viewport) => ({
        viewport: viewport.viewport,
        screenshotPath: viewport.screenshotPath,
        domGeometry: viewport.domGeometry,
        layoutIssues: viewport.layoutIssues,
        consoleErrors: (viewport.consoleMessages ?? []).map((message) => message.text),
        pageErrors: [...(viewport.pageErrors ?? [])],
        networkErrors: (viewport.networkErrors ?? []).map((error) => error.failureText ?? `${error.method} ${error.url}`),
        failedResponses: (viewport.failedResponses ?? []).map((response) => `${response.status} ${response.url}`),
        errors: [viewport.error ? mapError(viewport.error) : undefined].filter((error): error is PublicRuntimeScanError => Boolean(error)),
      })),
      executionSteps: routeResult.executionSteps?.map((step) => ({
        kind: step.kind,
        selector: step.selector,
        status: step.status,
        durationMs: step.durationMs,
        redacted: step.redacted,
        valueSource: step.valueSource,
        valueFromEnv: step.valueFromEnv,
        code: step.status === "failed" ? mapErrorCode(step.code) : undefined,
        message: step.message,
      })),
      errors: targetErrors,
    };
  });
  const errors = result.errors.map((error) => mapError(error)).filter((error): error is PublicRuntimeScanError => Boolean(error));
  const issueCount = targetResults.reduce((sum, target) => sum + target.viewportResults.reduce((viewportSum, viewport) => viewportSum + viewport.layoutIssues.length, 0), 0);
  const nestedErrorCount = targetResults.reduce((sum, target) => sum + target.errors.length + target.viewportResults.reduce((viewportSum, viewport) => viewportSum + viewport.errors.length, 0), 0);
  const failedTargets = targetResults.filter((target) => target.status === "failed").length;
  const hasPartialErrors = nestedErrorCount > 0;
  const publicResult: PublicRuntimeScanResult = {
    scanId: result.scanId,
    status: errors.length > 0 || (targetResults.length > 0 && failedTargets === targetResults.length) ? "failed" : hasPartialErrors || issueCount > 0 ? "warning" : "passed",
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: Math.max(0, Date.parse(result.finishedAt) - Date.parse(result.startedAt)) || 0,
    baseUrl: result.baseUrl,
    targets: result.targets.map((target): RuntimeResultTarget => {
      if (target.kind === "route") return { id: target.id, kind: "route", route: target.route };
      return { id: target.id, kind: target.kind, route: target.route ?? "/", name: target.name, steps: (target.steps ?? []).map(redactStep) };
    }),
    targetResults,
    summary: {
      targetCount: targetResults.length,
      viewportCount: targetResults.reduce((sum, target) => sum + target.viewportResults.length, 0),
      screenshotCount: result.summary.screenshotCount,
      issueCount,
      errorCount: errors.length + nestedErrorCount,
    },
    errors,
  };
  const validation = validateRuntimeScanResult(publicResult);
  if (!validation.ok) throw new RuntimePublicContractAdapterError("RUNTIME_SCAN_FAILED", "Public runtime scan result invalid.");
  return validation.value;
};
