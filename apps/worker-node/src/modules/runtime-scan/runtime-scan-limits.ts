import type { RuntimeScanLimits } from "./runtime-scan.schema";

export const RUNTIME_ROUTE_NETWORK_IDLE_TIMEOUT_MS = 5_000;
export const RUNTIME_INTERACTION_SETTLE_TIMEOUT_MS = 2_000;
export const MAX_RUNTIME_INTERACTIONS_PER_ROUTE = 20;

export const DEFAULT_RUNTIME_SCAN_LIMITS: RuntimeScanLimits = {
  maxRoutes: 25,
  maxTargets: 25,
  maxElementsPerViewport: 1_000,
  maxTextSnippetLength: 160,
  routeTimeoutMs: Number(process.env.WORKER_TIMEOUT ?? 15_000),
  scanTimeoutMs: 120_000,
  maxInteractionsPerRoute: 8,
  maxStatesPerRoute: 8,
  interactionDiscoveryTimeoutMs: 10_000,
  ignoredTags: ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK"],
};

export const resolveRuntimeScanLimits = (input?: Partial<RuntimeScanLimits>): RuntimeScanLimits => ({
  ...DEFAULT_RUNTIME_SCAN_LIMITS,
  ...input,
  ignoredTags: input?.ignoredTags ?? DEFAULT_RUNTIME_SCAN_LIMITS.ignoredTags,
});
