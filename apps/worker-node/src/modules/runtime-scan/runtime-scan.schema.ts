export const RUNTIME_SCAN_SCHEMA_VERSION = "runtime-scan.v1";

export type RuntimeScanViewport = { width: number; height: number };

export type RuntimeScanLimits = {
  maxRoutes: number;
  maxTargets: number;
  maxElementsPerViewport: number;
  maxTextSnippetLength: number;
  routeTimeoutMs: number;
  scanTimeoutMs: number;
  maxInteractionsPerRoute: number;
  maxStatesPerRoute: number;
  interactionDiscoveryTimeoutMs: number;
  ignoredTags: string[];
};

export type RuntimeInteractionControlKind = "tab" | "dropdown" | "modal-trigger" | "accordion" | "drawer" | "menu" | "toggle" | "filter-sort";
export type RuntimeInteractionSkipReason =
  | "disabled"
  | "requires-input"
  | "destructive"
  | "unsafe-candidate"
  | "not-visible"
  | "route-change-risk"
  | "limit-reached"
  | "duplicate-state"
  | "unsupported-control";
export type RuntimeInteractionSource = {
  candidateId: string;
  kind: RuntimeInteractionControlKind;
  label: string;
  action: "click";
};
export type RuntimeSkippedInteraction = {
  candidateId: string;
  kind?: RuntimeInteractionControlKind;
  label?: string;
  reason: RuntimeInteractionSkipReason;
};

export type RuntimeScanError = {
  code: string;
  message: string;
  targetId?: string;
  route?: string;
  remediation?: string;
};

export type RuntimeRouteTarget = { id: string; kind: "route"; route: string };
export type RuntimeFlowStep =
  | { kind: "goto"; route: string }
  | { kind: "click"; selector: string; allowDestructive?: boolean }
  | { kind: "fill"; selector: string; value?: string; valueFromEnv?: string }
  | { kind: "waitForSelector"; selector: string }
  | { kind: "waitForTimeout"; timeoutMs: number }
  | { kind: "screenshotMarker"; label: string };
export type RuntimeStateTarget = { id: string; kind: "state"; name: string; route?: string; steps?: RuntimeFlowStep[] };
export type RuntimeFlowTarget = { id: string; kind: "flow"; name: string; route?: string; steps: RuntimeFlowStep[] };
export type RuntimeScanTarget = RuntimeRouteTarget | RuntimeStateTarget | RuntimeFlowTarget;
export type RuntimeDiscoveryMode = "all-routes" | "selected-routes" | "custom-targets";

export type DomElementGeometry = {
  internalId: string;
  parentInternalId?: string;
  tagName: string;
  selectorHint?: string;
  id?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  rect: { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number };
  visibility: { display: string; visibility: string; opacity: number };
  viewportBoundary?: {
    horizontal: "viewport" | "clipped-ancestor" | "scrollable-ancestor";
    vertical: "viewport" | "clipped-ancestor" | "scrollable-ancestor";
  };
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

export type RuntimeLayoutIssueType =
  | "horizontal-overflow"
  | "element-outside-viewport"
  | "small-click-target"
  | "suspicious-overlap"
  | "zero-size-visible-element";

export type RuntimeLayoutIssue = {
  id: string;
  type: RuntimeLayoutIssueType;
  code: RuntimeLayoutIssueType;
  severity: "info" | "warning" | "error";
  message: string;
  scanTargetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  elementRef: string;
  evidence: {
    selectorHint?: string;
    boundingBox: DomElementGeometry["rect"];
    relatedElementRef?: string;
    relatedSelectorHint?: string;
    relatedBoundingBox?: DomElementGeometry["rect"];
    overlapArea?: number;
    overlapRatio?: number;
    viewport: RuntimeScanViewport;
    screenshotPath?: string;
    threshold: string;
  };
};

export type RuntimeViewportResult = {
  viewport: RuntimeScanViewport;
  stateId?: string;
  stateLabel?: string;
  stateDedupKey?: string;
  interactionSource?: RuntimeInteractionSource;
  skippedInteractions?: RuntimeSkippedInteraction[];
  screenshotPath?: string;
  screenshotError?: string;
  domGeometry?: DomGeometry;
  layoutIssues: RuntimeLayoutIssue[];
  error?: RuntimeScanError;
  consoleMessages?: RuntimeConsoleMessage[];
  pageErrors?: string[];
  networkErrors?: RuntimeNetworkError[];
  failedResponses?: RuntimeFailedResponse[];
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
  executionSteps?: {
    kind: RuntimeFlowStep["kind"];
    selector?: string;
    status: "passed" | "failed";
    durationMs: number;
    redacted?: boolean;
    valueSource?: "direct" | "env";
    valueFromEnv?: string;
    code?: string;
    message?: string;
  }[];
  durationMs: number;
};

export type RuntimeRouteResult = RuntimeTargetResult & {
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

const assertRuntimeTargetSafe = (target: unknown): void => {
  if (!isObject(target)) throw new Error("Runtime scan target must be object");
  if (target.kind !== "route" && target.kind !== "state" && target.kind !== "flow") throw new Error("Runtime scan target kind invalid");
  if (Array.isArray(target.steps)) {
    for (const step of target.steps) {
      if (isObject(step) && step.kind === "fill" && "value" in step) throw new Error("Runtime scan artifact fill values must be redacted");
    }
  }
};

const isRuntimeLayoutIssueType = (value: unknown): value is RuntimeLayoutIssueType =>
  value === "horizontal-overflow" ||
  value === "element-outside-viewport" ||
  value === "small-click-target" ||
  value === "suspicious-overlap" ||
  value === "zero-size-visible-element";

const assertRuntimeLayoutIssueSafe = (issue: unknown): void => {
  if (!isObject(issue)) throw new Error("Runtime layout issue must be object");
  if (!isRuntimeLayoutIssueType(issue.type)) throw new Error("Runtime layout issue type invalid");
  if (issue.code !== issue.type) throw new Error("Runtime layout issue code must equal type");
  if (!isString(issue.scanTargetId)) throw new Error("Runtime layout issue scanTargetId must be string");
  if (!isString(issue.elementRef)) throw new Error("Runtime layout issue elementRef must be string");
  if (!isObject(issue.evidence)) throw new Error("Runtime layout issue evidence must be object");
};

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
  for (const target of value.targets) assertRuntimeTargetSafe(target);
  if (!isObject(value.limits)) throw new Error("Runtime scan artifact limits must be object");
  for (const key of ["maxRoutes", "maxTargets", "maxElementsPerViewport", "maxTextSnippetLength", "routeTimeoutMs", "scanTimeoutMs", "maxInteractionsPerRoute", "maxStatesPerRoute", "interactionDiscoveryTimeoutMs"]) {
    if (!isNumber(value.limits[key])) throw new Error(`Runtime scan limit ${key} must be number`);
  }
  if (!Array.isArray(value.limits.ignoredTags)) throw new Error("Runtime scan ignoredTags must be array");
  if (!isObject(value.summary)) throw new Error("Runtime scan summary must be object");
  for (const route of value.routes) {
    if (!isObject(route)) throw new Error("Runtime scan route result must be object");
    if ("target" in route) assertRuntimeTargetSafe(route.target);
    if (!Array.isArray(route.viewportResults)) throw new Error("Runtime scan viewportResults must be array");
    for (const viewportResult of route.viewportResults) {
      if (!isObject(viewportResult)) throw new Error("Runtime scan viewport result must be object");
      const stateFieldCount = [viewportResult.stateId, viewportResult.stateLabel, viewportResult.stateDedupKey].filter(isString).length;
      if (stateFieldCount !== 0 && stateFieldCount !== 3) throw new Error("Runtime scan viewport state identity invalid");
      if (viewportResult.skippedInteractions !== undefined && !Array.isArray(viewportResult.skippedInteractions)) throw new Error("Runtime scan skippedInteractions must be array");
      if ("domGeometry" in viewportResult) {
        if (!isObject(viewportResult.domGeometry)) throw new Error("Runtime scan domGeometry must be object");
        if (!Array.isArray(viewportResult.domGeometry.elements)) throw new Error("Runtime scan domGeometry elements must be array");
      }
      if (!Array.isArray(viewportResult.layoutIssues)) throw new Error("Runtime scan layoutIssues must be array");
      for (const layoutIssue of viewportResult.layoutIssues) assertRuntimeLayoutIssueSafe(layoutIssue);
    }
  }
  return value as RuntimeScanResult;
};
