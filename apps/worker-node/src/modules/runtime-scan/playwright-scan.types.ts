import type { RuntimeScanTarget, RuntimeScanViewport } from "./runtime-scan.schema";

export type RuntimeScanRequest = {
  projectRoot: string;
  baseUrl: string;
  routes?: string[];
  targets?: RuntimeScanTarget[];
  discoveryMode?: "all-routes" | "selected-routes" | "custom-targets";
  viewportPreset?: "default";
  auth?: { useSavedState: true };
  storageStatePath?: string;
  viewport?: RuntimeScanViewport;
  headless?: boolean;
  timeoutMs?: number;
};

export type {
  DomElementGeometry,
  DomGeometry,
  RuntimeArtifactMeta,
  RuntimeConsoleMessage,
  RuntimeFailedResponse,
  RuntimeFlowTarget,
  RuntimeFlowStep,
  RuntimeDiscoveryMode,
  RuntimeLayoutIssue,
  RuntimeNetworkError,
  RuntimeRouteResult as RuntimeRouteScanResult,
  RuntimeRouteResult,
  RuntimeRouteTarget,
  RuntimeScanArtifacts,
  RuntimeScanError,
  RuntimeScanLimits,
  RuntimeScanResult,
  RuntimeScanSummary,
  RuntimeScanTarget,
  RuntimeScanViewport,
  RuntimeStateTarget,
  RuntimeTargetResult,
  RuntimeViewportResult,
} from "./runtime-scan.schema";
