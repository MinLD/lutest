export const RUNTIME_SCAN_SCHEMA_VERSION = "runtime-scan.v1";

export type RuntimeScanViewport = { width: number; height: number };

export type RuntimeScanLimits = {
  maxRoutes: number;
  maxTargets: number;
  maxElementsPerViewport: number;
  maxTextSnippetLength: number;
  maxScreenshots: number;
  routeTimeoutMs: number;
  scanTimeoutMs: number;
  ignoredTags: string[];
};

export type RuntimeScanError = {
  code: string;
  message: string;
  targetId?: string;
  route?: string;
  remediation?: string;
};

export type RuntimeRouteTarget = { id: string; kind: "route"; route: string };
export type RuntimeStateTarget = { id: string; kind: "state"; name: string };
export type RuntimeFlowStep = { kind: "placeholder"; description: string };
export type RuntimeFlowTarget = { id: string; kind: "flow"; name: string; steps: RuntimeFlowStep[] };
export type RuntimeScanTarget = RuntimeRouteTarget | RuntimeStateTarget | RuntimeFlowTarget;
export type RuntimeDiscoveryMode = "all-routes" | "selected-routes" | "custom-targets";

export type DomElementGeometry = {
  internalId: string;
  tagName: string;
  selectorHint?: string;
  id?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  rect: { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number };
  visibility: { display: string; visibility: string; opacity: number };
  clickable: boolean;
  order: number;
};

export type DomGeometry = {
  viewport: RuntimeScanViewport;
  capturedAt: string;
  elementCount: number;
  truncated: boolean;
  elements: DomElementGeometry[];
};

export type RuntimeLayoutIssue = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type RuntimeViewportResult = {
  viewport: RuntimeScanViewport;
  screenshotPath?: string;
  screenshotError?: string;
  domGeometry?: DomGeometry;
  layoutIssues: RuntimeLayoutIssue[];
};

export type RuntimeConsoleMessage = { type: string; text: string; location?: string };
export type RuntimeNetworkError = { url: string; method: string; failureText?: string };
export type RuntimeFailedResponse = { url: string; status: number; statusText: string };

export type RuntimeTargetResult = {
  targetId: string;
  target: RuntimeScanTarget;
  url?: string;
  status?: number;
  error?: RuntimeScanError;
  consoleMessages: RuntimeConsoleMessage[];
  pageErrors: string[];
  networkErrors: RuntimeNetworkError[];
  failedResponses: RuntimeFailedResponse[];
  viewportResults: RuntimeViewportResult[];
  durationMs: number;
};

export type RuntimeRouteResult = RuntimeTargetResult & {
  target: RuntimeRouteTarget;
  route: string;
  screenshotPath?: string;
  screenshotError?: string;
};

export type RuntimeScanSummary = {
  routeCount: number;
  targetCount: number;
  consoleMessageCount: number;
  pageErrorCount: number;
  networkErrorCount: number;
  failedResponseCount: number;
  screenshotCount: number;
  errorCount: number;
};

export type RuntimeArtifactMeta = {
  schemaVersion: typeof RUNTIME_SCAN_SCHEMA_VERSION;
  scanId: string;
  generatedAt: string;
  projectRoot: string;
  selectedRoot: string;
};

export type RuntimeScanArtifacts = { rootDir: string; screenshotsDir: string; resultPath: string };

export type RuntimeScanResult = RuntimeArtifactMeta & {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  targets: RuntimeScanTarget[];
  routes: RuntimeRouteResult[];
  limits: RuntimeScanLimits;
  errors: RuntimeScanError[];
  summary: RuntimeScanSummary;
  artifacts: RuntimeScanArtifacts;
  targetDiscovery?: {
    mode: RuntimeDiscoveryMode;
    targetIds: string[];
    reason: string;
  };
  routeDiscovery: {
    routes: string[];
    source: "request" | "production-graph" | "fallback";
    mode?: RuntimeDiscoveryMode;
    reason: string;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => Number.isFinite(value);

export const validateRuntimeScanResult = (value: unknown): RuntimeScanResult => {
  if (!isObject(value)) throw new Error("Runtime scan artifact must be an object");
  if (value.schemaVersion !== RUNTIME_SCAN_SCHEMA_VERSION) throw new Error("Runtime scan artifact schemaVersion mismatch");
  if (!isString(value.scanId)) throw new Error("Runtime scan artifact scanId must be string");
  if (!isString(value.generatedAt)) throw new Error("Runtime scan artifact generatedAt must be string");
  if (!isString(value.projectRoot)) throw new Error("Runtime scan artifact projectRoot must be string");
  if (!isString(value.selectedRoot)) throw new Error("Runtime scan artifact selectedRoot must be string");
  if (!Array.isArray(value.targets)) throw new Error("Runtime scan artifact targets must be array");
  if (!Array.isArray(value.routes)) throw new Error("Runtime scan artifact routes must be array");
  if (!Array.isArray(value.errors)) throw new Error("Runtime scan artifact errors must be array");
  for (const target of value.targets) {
    if (!isObject(target)) throw new Error("Runtime scan target must be object");
    if (target.kind !== "route" && target.kind !== "state" && target.kind !== "flow") throw new Error("Runtime scan target kind invalid");
  }
  if (!isObject(value.limits)) throw new Error("Runtime scan artifact limits must be object");
  for (const key of ["maxRoutes", "maxTargets", "maxElementsPerViewport", "maxTextSnippetLength", "maxScreenshots", "routeTimeoutMs", "scanTimeoutMs"]) {
    if (!isNumber(value.limits[key])) throw new Error(`Runtime scan limit ${key} must be number`);
  }
  if (!Array.isArray(value.limits.ignoredTags)) throw new Error("Runtime scan ignoredTags must be array");
  if (!isObject(value.summary)) throw new Error("Runtime scan summary must be object");
  for (const route of value.routes) {
    if (!isObject(route)) throw new Error("Runtime scan route result must be object");
    if (!Array.isArray(route.viewportResults)) throw new Error("Runtime scan viewportResults must be array");
    for (const viewportResult of route.viewportResults) {
      if (!isObject(viewportResult)) throw new Error("Runtime scan viewport result must be object");
      if ("domGeometry" in viewportResult) {
        if (!isObject(viewportResult.domGeometry)) throw new Error("Runtime scan domGeometry must be object");
        if (!Array.isArray(viewportResult.domGeometry.elements)) throw new Error("Runtime scan domGeometry elements must be array");
      }
    }
  }
  return value as RuntimeScanResult;
};
