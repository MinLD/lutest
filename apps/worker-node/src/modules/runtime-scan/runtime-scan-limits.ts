import type { RuntimeScanLimits } from "./runtime-scan.schema";

export const DEFAULT_RUNTIME_SCAN_LIMITS: RuntimeScanLimits = {
  maxRoutes: 25,
  maxTargets: 25,
  maxElementsPerViewport: 1_000,
  maxTextSnippetLength: 160,
  maxScreenshots: 25,
  routeTimeoutMs: Number(process.env.WORKER_TIMEOUT ?? 15_000),
  scanTimeoutMs: 120_000,
  ignoredTags: ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK"],
};

export const resolveRuntimeScanLimits = (input?: Partial<RuntimeScanLimits>): RuntimeScanLimits => ({
  ...DEFAULT_RUNTIME_SCAN_LIMITS,
  ...input,
  ignoredTags: input?.ignoredTags ?? DEFAULT_RUNTIME_SCAN_LIMITS.ignoredTags,
});
