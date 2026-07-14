export type ErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "SCHEMA_INVALID"
  | "PATH_NOT_ALLOWED"
  | "CONFIG_ERROR"
  | "BASE_URL_NOT_LOCAL"
  | "PLAYWRIGHT_BROWSER_MISSING"
  | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED"
  | "ROUTE_DISCOVERY_ERROR"
  | "TARGET_EXECUTION_ERROR"
  | "ROUTE_SCAN_ERROR"
  | "ARTIFACT_WRITE_ERROR"
  | "RUNTIME_SCAN_FAILED"
  | "AUTH_STATE_MISSING"
  | "AUTH_STATE_INVALID"
  | "AUTH_STATE_WRITE_FAILED"
  | "AUTH_SESSION_START_FAILED"
  | "AUTH_SESSION_TIMEOUT"
  | "REPORT_MALFORMED"
  | "REPORT_SCHEMA_INVALID"
  | "REPORT_PERMISSION_DENIED"
  | "RUNTIME_ARTIFACT_NOT_FOUND"
  | "RUNTIME_ARTIFACT_MALFORMED"
  | "RUNTIME_ARTIFACT_INVALID"
  | "RUNTIME_ARTIFACT_READ_FAILED"
  | "RUNTIME_SCREENSHOT_NOT_FOUND";

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface StatusResponse {
  status: "ok" | "error";
  uptime: number;
  service: "lutest-worker";
  runtime: "node";
  env: string;
}

export type DetectedFramework =
  | "next"
  | "vite-react"
  | "react"
  | "vue"
  | "laravel"
  | "php"
  | "unknown"
  | null;

export interface ProjectSummary {
  name: string;
  rootDir: string;
  lutestDir: string;
  packageJsonExists: boolean;
  detectedFramework: DetectedFramework;
  sourceFileCount?: number;
}
export type GraphNodeType = "page" | "component" | "api" | "file";
export type GraphEdgeType = "import" | "use" | "call";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  filePath: string;
  data?: SourceFileNodeData;
}

export interface GraphEdge {
  id: string;
  type: GraphEdgeType;
  source: string;
  target: string;
}

export interface GraphSummary {
  pageCount: number;
  componentCount: number;
  apiCount: number;
  fileCount: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: GraphSummary;
}

// Legacy GraphResponse is file-level graph for compatibility.
// ProductionGraphResponse is symbol-level graph target for R5+.
export type ProductionGraphNodeKind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint";

export type ProductionGraphEdgeKind =
  | "import"
  | "render"
  | "call"
  | "http"
  | "route";

export type GraphConfidence = "high" | "medium" | "low";

export interface ProductionGraphLoc {
  startLine: number;
  endLine: number;
}

export interface ProductionGraphRouteInfo {
  path: string;
  kind: "page" | "api";
}

export interface ProductionGraphHttpInfo {
  method?: string;
  path?: string;
}

export interface ProductionGraphNode {
  id: string;
  kind: ProductionGraphNodeKind;
  name: string;
  filePath?: string;
  loc?: ProductionGraphLoc;
  route?: ProductionGraphRouteInfo;
  http?: ProductionGraphHttpInfo;
  confidence: GraphConfidence;
  reason: string;
}

export interface ProductionGraphEdge {
  id: string;
  kind: ProductionGraphEdgeKind;
  source: string;
  target: string;
  confidence: GraphConfidence;
  reason: string;
}

export interface ProductionGraphSummary {
  fileCount: number;
  pageCount: number;
  componentCount: number;
  hookCount: number;
  apiRouteCount: number;
  apiClientMethodCount: number;
  externalEndpointCount: number;
  edgeCount: number;
}

export interface ProductionGraphResponse {
  mode: "symbol-level";
  nodes: ProductionGraphNode[];
  edges: ProductionGraphEdge[];
  summary: ProductionGraphSummary;
}
export interface ReportSummary {
  scanId: string;
  createdAt: string;
  status: "passed" | "failed" | "warning";
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export type LatestReportState = "missing" | "valid";

export type ArtifactRefKind = "static-report" | "production-graph" | "runtime-scan" | "runtime-scan-meta" | "screenshot";
export interface ArtifactRef { kind: ArtifactRefKind; ref: string; label?: string; sizeBytes?: number; generatedAt?: string }
export interface LatestStaticScanSummary { status: ScanResponse["status"]; issueCount: number; errorCount: number; warningCount: number; infoCount: number; sourceFileCount: number; reportRef?: ArtifactRef }
export interface LatestRuntimeIssueSummary { total: number; bySeverity: Record<string, number>; byType: Record<string, number> }
export interface LatestRuntimeScanSummary { status: RuntimeScanResult["status"]; targetCount: number; viewportCount: number; screenshotCount: number; issueCount: number; errorCount: number; issueSummary: LatestRuntimeIssueSummary; artifactRef?: ArtifactRef; meta?: RuntimeArtifactMeta }
export interface LatestProductionGraphSummary { summary?: ProductionGraphSummary; artifactRef?: ArtifactRef }
export interface LatestReportProjectMeta { name?: string; selectedRootRef?: string; selectedRootLabel?: string }

export type LatestReportResponse =
  | { state: "missing"; report: null; runtimeScan?: null; runtimeArtifactMeta?: null }
  | { state: "valid"; report: ScanResponse; generatedAt?: string; project?: LatestReportProjectMeta; staticScan?: LatestStaticScanSummary; productionGraph?: LatestProductionGraphSummary | null; runtimeScanSummary?: LatestRuntimeScanSummary | null; artifactRefs?: ArtifactRef[]; runtimeScan?: RuntimeScanResult | null; runtimeArtifactMeta?: RuntimeArtifactMeta | null };

export interface ScanRequest {
  projectPath?: string;
  runtimeScan?: RuntimeScanRequest;
}

export interface ProjectPathQuery {
  path?: string;
  projectPath?: string;
}

export type ScanIssueType =
  | "console"
  | "syntax"
  | "overflow"
  | "todo"
  | "large-file"
  | "maintainability"
  | "unknown";

export interface ScanIssue {
  id: string;
  type: ScanIssueType;
  severity: "info" | "warning" | "error";
  message: string;
  filePath?: string;
}

export interface ScanResponse {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed" | "warning";
  project: ProjectSummary;
  sourceFileCount: number;
  issues: ScanIssue[];
  reportPath: string;
  runtimeScan?: RuntimeScanResult | null;
}

export type RuntimeDiscoveryMode = "all-routes" | "selected-routes" | "custom-targets";
export type RuntimeTargetKind = "route" | "state" | "flow";
export type RuntimeFlowStep =
  | { kind: "goto"; route: string }
  | { kind: "click"; selector: string; allowDestructive?: boolean }
  | { kind: "fill"; selector: string; value?: string; valueFromEnv?: string }
  | { kind: "waitForSelector"; selector: string }
  | { kind: "waitForTimeout"; timeoutMs: number }
  | { kind: "screenshotMarker"; label: string };
export type RuntimeResultFlowStep =
  | Exclude<RuntimeFlowStep, { kind: "fill" }>
  | { kind: "fill"; selector: string; redacted: true; valueSource?: "direct" | "env"; valueFromEnv?: string };
export type RuntimeScanTarget =
  | { id: string; kind: "route"; route: string; name?: string }
  | { id: string; kind: "state"; route: string; name?: string; steps: RuntimeFlowStep[] }
  | { id: string; kind: "flow"; route: string; name?: string; steps: RuntimeFlowStep[] };
export type RuntimeResultTarget =
  | { id: string; kind: "route"; route: string; name?: string }
  | { id: string; kind: "state"; route: string; name?: string; steps: RuntimeResultFlowStep[] }
  | { id: string; kind: "flow"; route: string; name?: string; steps: RuntimeResultFlowStep[] };
export interface RuntimeScanRequest {
  enabled: true;
  baseUrl: string;
  routes?: string[];
  targets?: RuntimeScanTarget[];
  discoveryMode?: RuntimeDiscoveryMode;
  viewportPreset?: "default";
  auth?: { useSavedState?: true; promptOnRedirect?: true };
  interactionDiscovery?: {
    enabled: true;
    maxInteractionsPerRoute?: number;
    maxStatesPerRoute?: number;
    timeoutMs?: number;
  };
}
export type AuthErrorCode = "AUTH_STATE_MISSING" | "AUTH_STATE_INVALID" | "AUTH_STATE_WRITE_FAILED" | "AUTH_SESSION_START_FAILED" | "AUTH_SESSION_TIMEOUT";
export interface AuthError { code: AuthErrorCode; message: string }
export interface AuthStateSummary { exists: boolean; valid: boolean; savedAt?: string; updatedAt?: string; expiresAt?: string; storageStateRef?: string }
export interface AuthStartRequest { projectPath?: string; baseUrl: string; timeoutMs?: number; successSelector?: string; successUrlIncludes?: string }
export interface AuthStartResponse { status: "saved" | "timeout" | "failed"; authState?: AuthStateSummary; error?: AuthError }
export interface AuthStatusResponse extends AuthStateSummary { status: "missing" | "valid" | "invalid"; error?: AuthError }
export interface AuthClearResponse { cleared: boolean; status: "cleared" | "missing" }
export interface RuntimeScanViewport { width: number; height: number }
export type RuntimeInteractionControlKind = "tab" | "dropdown" | "modal-trigger" | "accordion" | "drawer" | "menu" | "toggle" | "filter-sort";
export type RuntimeInteractionSkipReason = "disabled" | "requires-input" | "destructive" | "unsafe-candidate" | "not-visible" | "route-change-risk" | "limit-reached" | "duplicate-state" | "unsupported-control";
export interface RuntimeInteractionSource { candidateId: string; kind: RuntimeInteractionControlKind; label: string; action: "click" }
export interface RuntimeSkippedInteraction { candidateId: string; kind?: RuntimeInteractionControlKind; label?: string; reason: RuntimeInteractionSkipReason }
export interface RuntimeRect { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number }
export interface RuntimeTextStyleEvidence { foregroundColor: string; backgroundColor: string; fontSizePx: number; fontWeight: number; largeText: boolean }
export interface RuntimeOklchColorEvidence { l: number; c: number; h: number }
export interface RuntimeOklchDeltaEvidence { lightness: number; chroma: number; hue: number }
export type RuntimeReadabilitySkipReason = "aria-hidden" | "text-shadow" | "background-image" | "transparent-ancestor" | "transparent-foreground" | "invalid-color" | "invalid-font-size" | "unsupported-effect";
export interface RuntimeReadabilityCoverage { candidateTextCount: number; checkedTextCount: number; skippedTextCount: number; skippedByReason: Partial<Record<RuntimeReadabilitySkipReason, number>>; incomplete: boolean }
export interface DomElementGeometry {
  internalId: string;
  tagName: string;
  selectorHint?: string;
  id?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  rect: RuntimeRect;
  visibility: { display: string; visibility: string; opacity: number };
  textStyle?: RuntimeTextStyleEvidence;
  focusBehavior?: { visibleOnFocus: boolean; rect?: RuntimeRect };
  clickable: boolean;
  order: number;
}
export interface DomGeometry { viewport: RuntimeScanViewport; capturedAt: string; elementCount: number; truncated: boolean; readabilityCoverage?: RuntimeReadabilityCoverage; elements: DomElementGeometry[] }
export type RuntimeLayoutIssueType = "horizontal-overflow" | "element-outside-viewport" | "small-click-target" | "suspicious-overlap" | "zero-size-visible-element" | "low-text-contrast";
export interface RuntimeLayoutIssue {
  id: string;
  type: RuntimeLayoutIssueType;
  code?: RuntimeLayoutIssueType;
  severity: "info" | "warning" | "error";
  message: string;
  scanTargetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  elementRef: string;
  evidence: {
    selectorHint?: string;
    boundingBox: RuntimeRect;
    relatedElementRef?: string;
    relatedSelectorHint?: string;
    relatedBoundingBox?: RuntimeRect;
    overlapArea?: number;
    overlapRatio?: number;
    viewport: RuntimeScanViewport;
    screenshotPath?: string;
    threshold: string;
    foregroundColor?: string;
    backgroundColor?: string;
    contrastRatio?: number;
    requiredContrastRatio?: number;
    foregroundOklch?: RuntimeOklchColorEvidence;
    backgroundOklch?: RuntimeOklchColorEvidence;
    oklchDelta?: RuntimeOklchDeltaEvidence;
    suggestedForegroundColor?: string;
    suggestedBackgroundColor?: string;
    suggestionReason?: string;
  };
}
export type RuntimeErrorCode =
  | "CONFIG_ERROR"
  | "PATH_NOT_ALLOWED"
  | "BASE_URL_NOT_LOCAL"
  | "PLAYWRIGHT_BROWSER_MISSING"
  | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED"
  | "ROUTE_DISCOVERY_ERROR"
  | "TARGET_EXECUTION_ERROR"
  | "ROUTE_SCAN_ERROR"
  | "ARTIFACT_WRITE_ERROR"
  | "RUNTIME_SCAN_FAILED"
  | "RUNTIME_BASE_URL_NOT_ALLOWED"
  | "RUNTIME_SCAN_ARTIFACT_INVALID"
  | "RUNTIME_SCAN_ARTIFACT_MALFORMED"
  | "RUNTIME_FLOW_ENV_VALUE_MISSING"
  | "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED"
  | "RUNTIME_LAYOUT_ISSUE_DETECTION_FAILED";
export interface RuntimeScanError { code: RuntimeErrorCode; message: string; targetId?: string; viewport?: RuntimeScanViewport; stepIndex?: number }
export interface RuntimeViewportResult { viewport: RuntimeScanViewport; stateId?: string; stateLabel?: string; stateDedupKey?: string; interactionSource?: RuntimeInteractionSource; skippedInteractions?: RuntimeSkippedInteraction[]; readabilityCoverage?: RuntimeReadabilityCoverage; screenshotPath?: string; domGeometry?: DomGeometry; layoutIssues: RuntimeLayoutIssue[]; consoleErrors: string[]; pageErrors: string[]; networkErrors: string[]; failedResponses: string[]; errors: RuntimeScanError[] }
export interface RuntimeExecutionStep { kind: RuntimeFlowStep["kind"]; selector?: string; status: "passed" | "failed"; durationMs: number; redacted?: boolean; valueSource?: "direct" | "env"; valueFromEnv?: string; code?: RuntimeErrorCode; message?: string }
export interface RuntimeTargetResult { scanTargetId: string; kind: RuntimeTargetKind; route: string; name?: string; status: "passed" | "failed" | "warning"; viewportResults: RuntimeViewportResult[]; executionSteps?: RuntimeExecutionStep[]; errors: RuntimeScanError[] }
export interface RuntimeScanResult { scanId: string; status: "passed" | "failed" | "warning"; startedAt: string; finishedAt: string; durationMs: number; baseUrl: string; targets: RuntimeResultTarget[]; targetResults: RuntimeTargetResult[]; summary: { targetCount: number; viewportCount: number; screenshotCount: number; issueCount: number; errorCount: number }; errors: RuntimeScanError[] }
export interface RuntimeArtifactMeta { scanId: string; savedAt: string; schemaVersion: string; artifactVersion?: number; targetCount: number; viewportCount: number; screenshotCount: number; issueCount: number; errorCount?: number }
export type RuntimeScreenshotMissingReason = "not-captured" | "capture-failed" | "artifact-missing" | "artifact-invalid";
export interface RuntimeArtifactScreenshotEvidence { available: boolean; ref?: string; missingReason?: RuntimeScreenshotMissingReason }
export interface RuntimeArtifactIssueEvidence {
  scanTargetId: string;
  route: string;
  stateId?: string;
  stateLabel?: string;
  viewport: RuntimeScanViewport;
  selector?: string;
  elementRef: string;
  boundingBox: RuntimeRect;
  relatedBoundingBox?: RuntimeRect;
  screenshot: RuntimeArtifactScreenshotEvidence;
  reason: string;
  foregroundColor?: string;
  backgroundColor?: string;
  contrastRatio?: number;
  requiredContrastRatio?: number;
  foregroundOklch?: RuntimeOklchColorEvidence;
  backgroundOklch?: RuntimeOklchColorEvidence;
  oklchDelta?: RuntimeOklchDeltaEvidence;
  suggestedForegroundColor?: string;
  suggestedBackgroundColor?: string;
  suggestionReason?: string;
  dedupKey: string;
  stateDedupKey?: string;
}
export interface RuntimeArtifactIssueDetail { id: string; type: RuntimeLayoutIssueType; severity: RuntimeLayoutIssue["severity"]; message: string; evidence: RuntimeArtifactIssueEvidence }
export type RuntimeArtifactDiagnosticKind = "console-warning" | "console-error" | "page-error" | "network-error" | "failed-response";
export interface RuntimeArtifactDiagnostic { kind: RuntimeArtifactDiagnosticKind; message: string }
export interface RuntimeArtifactViewportDetail { viewport: RuntimeScanViewport; stateId?: string; stateLabel?: string; stateDedupKey?: string; interactionSource?: RuntimeInteractionSource; skippedInteractions?: RuntimeSkippedInteraction[]; readabilityCoverage?: RuntimeReadabilityCoverage; screenshot: RuntimeArtifactScreenshotEvidence; diagnostics: RuntimeArtifactDiagnostic[]; issues: RuntimeArtifactIssueDetail[] }
export interface RuntimeArtifactTargetDetail { scanTargetId: string; kind: RuntimeTargetKind; route: string; stateId?: string; stateLabel?: string; status: RuntimeTargetResult["status"]; viewportResults: RuntimeArtifactViewportDetail[] }
export interface RuntimeArtifactDetailResponse { scanId: string; status: RuntimeScanResult["status"]; startedAt: string; finishedAt: string; durationMs: number; baseUrl: string; summary: RuntimeScanResult["summary"]; targetResults: RuntimeArtifactTargetDetail[] }
export interface RuntimeArtifactScreenshotQuery extends ProjectPathQuery { ref: string }

export interface ImportEdgeData {
  importPath: string;
  resolvedPath?: string;
}

export type ApiCallKind = "fetch" | "axios" | "ky" | "ofetch" | "custom-client";

export type ApiCallInfo = {
  kind: ApiCallKind;
  target: string;
  method?: string;
  line: number;
};

export type SourceFileNodeData = {
  relativePath?: string;
  extension?: string;
  lineCount?: number;
  apiCalls?: ApiCallInfo[];
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "INVALID_REQUEST" | "SCHEMA_INVALID";
      message: string;
      details?: unknown;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0;

const isOptionalNonEmptyString = (value: unknown): value is string | undefined =>
  value === undefined || isNonEmptyString(value);

const isErrorCode = (value: unknown): value is ErrorCode =>
  value === "INVALID_REQUEST" ||
  value === "NOT_FOUND" ||
  value === "INTERNAL_ERROR" ||
  value === "SCHEMA_INVALID" ||
  value === "PATH_NOT_ALLOWED" ||
  value === "CONFIG_ERROR" ||
  value === "BASE_URL_NOT_LOCAL" ||
  value === "PLAYWRIGHT_BROWSER_MISSING" ||
  value === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" ||
  value === "ROUTE_DISCOVERY_ERROR" ||
  value === "TARGET_EXECUTION_ERROR" ||
  value === "ROUTE_SCAN_ERROR" ||
  value === "ARTIFACT_WRITE_ERROR" ||
  value === "RUNTIME_SCAN_FAILED" ||
  value === "AUTH_STATE_MISSING" ||
  value === "AUTH_STATE_INVALID" ||
  value === "AUTH_STATE_WRITE_FAILED" ||
  value === "AUTH_SESSION_START_FAILED" ||
  value === "AUTH_SESSION_TIMEOUT" ||
  value === "REPORT_MALFORMED" ||
  value === "REPORT_SCHEMA_INVALID" ||
  value === "REPORT_PERMISSION_DENIED" ||
  value === "RUNTIME_ARTIFACT_NOT_FOUND" ||
  value === "RUNTIME_ARTIFACT_MALFORMED" ||
  value === "RUNTIME_ARTIFACT_INVALID" ||
  value === "RUNTIME_ARTIFACT_READ_FAILED" ||
  value === "RUNTIME_SCREENSHOT_NOT_FOUND";

const isScanIssueType = (value: unknown): value is ScanIssueType =>
  value === "console" ||
  value === "syntax" ||
  value === "overflow" ||
  value === "todo" ||
  value === "large-file" ||
  value === "maintainability" ||
  value === "unknown";

const isScanIssueSeverity = (
  value: unknown,
): value is ScanIssue["severity"] =>
  value === "info" || value === "warning" || value === "error";

const isLatestReportState = (value: unknown): value is LatestReportState =>
  value === "missing" ||
  value === "valid";

const isScanStatus = (value: unknown): value is ScanResponse["status"] =>
  value === "passed" || value === "failed" || value === "warning";

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || isString(value);
const runtimeInvalid = <T>(message: string): ValidationResult<T> => ({ ok: false, code: "SCHEMA_INVALID", message });

const validateLocalRuntimeBaseUrl = (baseUrl: unknown): ValidationResult<string> => {
  if (!isNonEmptyString(baseUrl)) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl must be a non-empty string" };
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl is invalid" }; }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.baseUrl must be a local HTTP(S) URL" };
  }
  return { ok: true, value: parsed.toString().replace(/\/$/, "") };
};

const isLocalRoute = (value: unknown): value is string => {
  if (!isNonEmptyString(value) || !value.startsWith("/") || value.startsWith("//") || value.includes("\0") || value.includes("\\")) return false;
  const rawPathPart = value.split(/[?#]/, 1)[0] ?? value;
  let pathPart: string;
  try {
    pathPart = decodeURIComponent(rawPathPart);
  } catch {
    return false;
  }
  if (pathPart.includes("\0") || pathPart.includes("\\")) return false;
  const segments = pathPart.split("/");
  return !segments.some((segment) => segment === "." || segment === ".." || segment === ".lutest");
};
const isRuntimeDiscoveryMode = (value: unknown): value is RuntimeDiscoveryMode => value === "all-routes" || value === "selected-routes" || value === "custom-targets";
const isRuntimeLayoutIssueType = (value: unknown): value is RuntimeLayoutIssueType => value === "horizontal-overflow" || value === "element-outside-viewport" || value === "small-click-target" || value === "suspicious-overlap" || value === "zero-size-visible-element" || value === "low-text-contrast";
const isRuntimeReadabilitySkipReason = (value: unknown): value is RuntimeReadabilitySkipReason => value === "aria-hidden" || value === "text-shadow" || value === "background-image" || value === "transparent-ancestor" || value === "transparent-foreground" || value === "invalid-color" || value === "invalid-font-size" || value === "unsupported-effect";
const WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX = 24;
const WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX = 18.6667;
const WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT = 700;
const isHexColor = (value: unknown): value is string => isString(value) && /^#[0-9a-f]{6}$/i.test(value);
const isContrastRatio = (value: unknown): value is number => isFiniteNumber(value) && value >= 1 && value <= 21;
const isRequiredContrastRatio = (value: unknown): value is 3 | 4.5 => value === 3 || value === 4.5;
const validateRuntimeOklchColorEvidence = (value: unknown): ValidationResult<RuntimeOklchColorEvidence> => {
  if (!isRecord(value)) return runtimeInvalid("OKLCH color evidence must be object");
  const keys = rejectUnknownKeys(value, ["l", "c", "h"]); if (!keys.ok) return keys;
  if (!isFiniteNumber(value.l) || value.l < 0 || value.l > 1 || !isFiniteNumber(value.c) || value.c < 0 || !isFiniteNumber(value.h) || value.h < 0 || value.h >= 360) return runtimeInvalid("OKLCH color evidence invalid");
  return { ok: true, value: { l: value.l, c: value.c, h: value.h } };
};
const validateRuntimeOklchDeltaEvidence = (value: unknown): ValidationResult<RuntimeOklchDeltaEvidence> => {
  if (!isRecord(value)) return runtimeInvalid("OKLCH delta evidence must be object");
  const keys = rejectUnknownKeys(value, ["lightness", "chroma", "hue"]); if (!keys.ok) return keys;
  if (!isFiniteNumber(value.lightness) || value.lightness < 0 || value.lightness > 1 || !isFiniteNumber(value.chroma) || value.chroma < 0 || !isFiniteNumber(value.hue) || value.hue < 0 || value.hue > 180) return runtimeInvalid("OKLCH delta evidence invalid");
  return { ok: true, value: { lightness: value.lightness, chroma: value.chroma, hue: value.hue } };
};
const hexRelativeLuminance = (value: string): number => {
  const channel = (offset: number): number => {
    const normalized = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
const hexContrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = hexRelativeLuminance(foreground);
  const backgroundLuminance = hexRelativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
};
const containsSensitiveRuntimeText = (value: string): boolean => /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:password|passwd|pwd|token|api[-_ ]?key|secret)\s*[:=]\s*[^\s,;]+|\b(?=[A-Za-z0-9_-]{32,}\b)(?=[A-Za-z0-9_-]*[0-9_-])[A-Za-z0-9_-]{32,}\b/i.test(value);
const isRuntimeErrorCode = (value: unknown): value is RuntimeErrorCode => value === "CONFIG_ERROR" || value === "PATH_NOT_ALLOWED" || value === "BASE_URL_NOT_LOCAL" || value === "PLAYWRIGHT_BROWSER_MISSING" || value === "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" || value === "ROUTE_DISCOVERY_ERROR" || value === "TARGET_EXECUTION_ERROR" || value === "ROUTE_SCAN_ERROR" || value === "ARTIFACT_WRITE_ERROR" || value === "RUNTIME_SCAN_FAILED" || value === "RUNTIME_BASE_URL_NOT_ALLOWED" || value === "RUNTIME_SCAN_ARTIFACT_INVALID" || value === "RUNTIME_SCAN_ARTIFACT_MALFORMED" || value === "RUNTIME_FLOW_ENV_VALUE_MISSING" || value === "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED" || value === "RUNTIME_LAYOUT_ISSUE_DETECTION_FAILED";
const isAuthErrorCode = (value: unknown): value is AuthErrorCode => value === "AUTH_STATE_MISSING" || value === "AUTH_STATE_INVALID" || value === "AUTH_STATE_WRITE_FAILED" || value === "AUTH_SESSION_START_FAILED" || value === "AUTH_SESSION_TIMEOUT";
const isSafeId = (value: unknown): value is string => isNonEmptyString(value) && /^[a-zA-Z0-9._:-]+$/.test(value) && !value.includes("..");
const isSafeOpaqueScreenshotRef = (value: unknown): value is string => isNonEmptyString(value) && /^shot_[a-f0-9]{32}$/.test(value);
const isRuntimeScreenshotMissingReason = (value: unknown): value is RuntimeScreenshotMissingReason => value === "not-captured" || value === "capture-failed" || value === "artifact-missing" || value === "artifact-invalid";
const isRuntimeArtifactDiagnosticKind = (value: unknown): value is RuntimeArtifactDiagnosticKind => value === "console-warning" || value === "console-error" || value === "page-error" || value === "network-error" || value === "failed-response";
const isRuntimeInteractionControlKind = (value: unknown): value is RuntimeInteractionControlKind => value === "tab" || value === "dropdown" || value === "modal-trigger" || value === "accordion" || value === "drawer" || value === "menu" || value === "toggle" || value === "filter-sort";
const isRuntimeInteractionSkipReason = (value: unknown): value is RuntimeInteractionSkipReason => value === "disabled" || value === "requires-input" || value === "destructive" || value === "unsafe-candidate" || value === "not-visible" || value === "route-change-risk" || value === "limit-reached" || value === "duplicate-state" || value === "unsupported-control";
const isPublicSafeDetailText = (value: unknown): value is string =>
  isNonEmptyString(value) &&
  !value.includes("\0") &&
  !value.includes(".lutest") &&
  !/(^|[\s"'(])\/(?:home|Users|tmp|var|root|mnt|workspace)\//.test(value) &&
  !/(^|[\s"'(])[a-zA-Z]:[\\/]/.test(value) &&
  !/\n\s*at\s+/i.test(value) &&
  !/(?:cookie|token|password|storageState|localStorage|sessionStorage)\s*[:=]/i.test(value);
const isSafeEnvName = (value: unknown): value is string => isNonEmptyString(value) && /^[A-Z_][A-Z0-9_]*$/.test(value);

const validateRuntimeFlowStep = (value: unknown): ValidationResult<RuntimeFlowStep> => {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST", message: "runtime flow step must be an object" };
  const stepKeys = rejectUnknownKeys(value, ["kind", "route", "selector", "allowDestructive", "value", "valueFromEnv", "timeoutMs", "label"]); if (!stepKeys.ok) return stepKeys;
  if (value.kind === "goto") return isLocalRoute(value.route) ? { ok: true, value: { kind: "goto", route: value.route } } : { ok: false, code: "INVALID_REQUEST", message: "goto.route must be local" };
  if (value.kind === "click") {
    if (!isNonEmptyString(value.selector)) return { ok: false, code: "INVALID_REQUEST", message: "click.selector is required" };
    if (/delete|remove|logout|log-out|signout|sign-out|submit|save|confirm|danger|destructive/i.test(value.selector) && value.allowDestructive !== true) return { ok: false, code: "INVALID_REQUEST", message: "destructive click requires allowDestructive" };
    return { ok: true, value: { kind: "click", selector: value.selector, allowDestructive: value.allowDestructive === true ? true : undefined } };
  }
  if (value.kind === "fill") {
    if (!isNonEmptyString(value.selector)) return { ok: false, code: "INVALID_REQUEST", message: "fill.selector is required" };
    if (value.value !== undefined && !isString(value.value)) return { ok: false, code: "INVALID_REQUEST", message: "fill.value must be a string" };
    if (value.valueFromEnv !== undefined && !isSafeEnvName(value.valueFromEnv)) return { ok: false, code: "INVALID_REQUEST", message: "fill.valueFromEnv is invalid" };
    if (value.value === undefined && value.valueFromEnv === undefined) return { ok: false, code: "INVALID_REQUEST", message: "fill requires value or valueFromEnv" };
    return { ok: true, value: { kind: "fill", selector: value.selector, value: value.value, valueFromEnv: value.valueFromEnv } };
  }
  if (value.kind === "waitForSelector") return isNonEmptyString(value.selector) ? { ok: true, value: { kind: "waitForSelector", selector: value.selector } } : { ok: false, code: "INVALID_REQUEST", message: "waitForSelector.selector is required" };
  if (value.kind === "waitForTimeout") {
    const timeoutMs = value.timeoutMs;
    return typeof timeoutMs === "number" && Number.isInteger(timeoutMs) && timeoutMs >= 0 && timeoutMs <= 10_000 ? { ok: true, value: { kind: "waitForTimeout", timeoutMs } } : { ok: false, code: "INVALID_REQUEST", message: "waitForTimeout.timeoutMs must be 0..10000" };
  }
  if (value.kind === "screenshotMarker") return isNonEmptyString(value.label) ? { ok: true, value: { kind: "screenshotMarker", label: value.label } } : { ok: false, code: "INVALID_REQUEST", message: "screenshotMarker.label is required" };
  return { ok: false, code: "INVALID_REQUEST", message: "runtime flow step kind is invalid" };
};

const validateRuntimeResultFlowStep = (value: unknown): ValidationResult<RuntimeResultFlowStep> => {
  if (!isRecord(value)) return runtimeInvalid("runtime result flow step must be an object");
  const stepKeys = rejectUnknownKeys(value, ["kind", "route", "selector", "allowDestructive", "redacted", "valueSource", "valueFromEnv", "timeoutMs", "label"]); if (!stepKeys.ok) return stepKeys;
  if (value.kind === "fill") {
    if (!isNonEmptyString(value.selector) || value.redacted !== true) return runtimeInvalid("runtime result fill step must be redacted");
    if (value.valueSource !== undefined && value.valueSource !== "direct" && value.valueSource !== "env") return runtimeInvalid("runtime result fill valueSource invalid");
    if (value.valueFromEnv !== undefined && !isSafeEnvName(value.valueFromEnv)) return runtimeInvalid("runtime result fill valueFromEnv invalid");
    return { ok: true, value: { kind: "fill", selector: value.selector, redacted: true, valueSource: value.valueSource, valueFromEnv: value.valueFromEnv } };
  }
  return validateRuntimeFlowStep(value) as ValidationResult<RuntimeResultFlowStep>;
};

const validateRuntimeTarget = (value: unknown): ValidationResult<RuntimeScanTarget> => {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST", message: "runtime target must be an object" };
  const keys = rejectUnknownKeys(value, ["id", "kind", "route", "name", "steps"]); if (!keys.ok) return keys;
  if (!isSafeId(value.id)) return { ok: false, code: "INVALID_REQUEST", message: "runtime target id is invalid" };
  if (!isLocalRoute(value.route)) return { ok: false, code: "INVALID_REQUEST", message: "runtime target route must be local" };
  const name = isOptionalString(value.name) ? value.name : undefined;
  if (value.kind === "route") return { ok: true, value: { id: value.id, kind: "route", route: value.route, name } };
  if (value.kind === "state" || value.kind === "flow") {
    if (!Array.isArray(value.steps)) return { ok: false, code: "INVALID_REQUEST", message: "runtime target steps must be an array" };
    const steps: RuntimeFlowStep[] = [];
    for (const rawStep of value.steps) { const step = validateRuntimeFlowStep(rawStep); if (!step.ok) return step; steps.push(step.value); }
    return { ok: true, value: { id: value.id, kind: value.kind, route: value.route, name, steps } };
  }
  return { ok: false, code: "INVALID_REQUEST", message: "runtime target kind is invalid" };
};

const validateRuntimeResultTarget = (value: unknown): ValidationResult<RuntimeResultTarget> => {
  if (!isRecord(value)) return runtimeInvalid("runtime result target must be an object");
  const keys = rejectUnknownKeys(value, ["id", "kind", "route", "name", "steps"]); if (!keys.ok) return keys;
  if (!isSafeId(value.id) || !isLocalRoute(value.route)) return runtimeInvalid("runtime result target identity invalid");
  const name = isOptionalString(value.name) ? value.name : undefined;
  if (value.kind === "route") return { ok: true, value: { id: value.id, kind: "route", route: value.route, name } };
  if (value.kind === "state" || value.kind === "flow") {
    if (!Array.isArray(value.steps)) return runtimeInvalid("runtime result target steps must be array");
    const steps: RuntimeResultFlowStep[] = [];
    for (const rawStep of value.steps) { const step = validateRuntimeResultFlowStep(rawStep); if (!step.ok) return step; steps.push(step.value); }
    return { ok: true, value: { id: value.id, kind: value.kind, route: value.route, name, steps } };
  }
  return runtimeInvalid("runtime result target kind invalid");
};

export const validateRuntimeScanRequest = (value: unknown): ValidationResult<RuntimeScanRequest> => {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan must be an object" };
  const keys = rejectUnknownKeys(value, ["enabled", "baseUrl", "routes", "targets", "discoveryMode", "viewportPreset", "auth", "interactionDiscovery"]); if (!keys.ok) return keys;
  if (value.enabled !== true) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.enabled must be true" };
  const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl); if (!baseUrl.ok) return baseUrl;
  const routes = value.routes === undefined ? undefined : Array.isArray(value.routes) && value.routes.every(isLocalRoute) ? value.routes : undefined;
  if (value.routes !== undefined && routes === undefined) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.routes must be local routes" };
  const targets: RuntimeScanTarget[] | undefined = value.targets === undefined ? undefined : [];
  if (value.targets !== undefined) { if (!Array.isArray(value.targets)) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.targets must be an array" }; for (const rawTarget of value.targets) { const target = validateRuntimeTarget(rawTarget); if (!target.ok) return target; targets?.push(target.value); } }
  if (value.discoveryMode !== undefined && !isRuntimeDiscoveryMode(value.discoveryMode)) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.discoveryMode is invalid" };
  if (value.discoveryMode === "selected-routes" && (!routes?.length || Boolean(targets?.length))) return { ok: false, code: "INVALID_REQUEST", message: "selected-routes requires one or more routes and no custom targets" };
  if (value.discoveryMode === "all-routes" && (Boolean(routes?.length) || Boolean(targets?.length))) return { ok: false, code: "INVALID_REQUEST", message: "all-routes must not include routes or custom targets" };
  if (value.discoveryMode === "custom-targets" && (!targets?.length || Boolean(routes?.length))) return { ok: false, code: "INVALID_REQUEST", message: "custom-targets requires one or more targets and no routes" };
  if (value.viewportPreset !== undefined && value.viewportPreset !== "default") return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.viewportPreset is invalid" };
  if (value.auth !== undefined) {
    if (!isRecord(value.auth)) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.auth must be an object" };
    const authKeys = rejectUnknownKeys(value.auth, ["useSavedState", "promptOnRedirect"]); if (!authKeys.ok) return authKeys;
    if (value.auth.useSavedState !== undefined && value.auth.useSavedState !== true) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.auth.useSavedState must be true" };
    if (value.auth.promptOnRedirect !== undefined && value.auth.promptOnRedirect !== true) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.auth.promptOnRedirect must be true" };
    if (value.auth.useSavedState !== true && value.auth.promptOnRedirect !== true) return { ok: false, code: "INVALID_REQUEST", message: "runtimeScan.auth requires useSavedState or promptOnRedirect" };
  }
  let interactionDiscovery: RuntimeScanRequest["interactionDiscovery"];
  if (value.interactionDiscovery !== undefined) {
    if (!isRecord(value.interactionDiscovery)) return runtimeInvalid("runtimeScan.interactionDiscovery must be an object");
    const discoveryKeys = rejectUnknownKeys(value.interactionDiscovery, ["enabled", "maxInteractionsPerRoute", "maxStatesPerRoute", "timeoutMs"]); if (!discoveryKeys.ok) return discoveryKeys;
    if (value.interactionDiscovery.enabled !== true) return runtimeInvalid("runtimeScan.interactionDiscovery.enabled must be true");
    const maxInteractionsPerRoute = value.interactionDiscovery.maxInteractionsPerRoute;
    const maxStatesPerRoute = value.interactionDiscovery.maxStatesPerRoute;
    const timeoutMs = value.interactionDiscovery.timeoutMs;
    if (maxInteractionsPerRoute !== undefined && (typeof maxInteractionsPerRoute !== "number" || !Number.isInteger(maxInteractionsPerRoute) || maxInteractionsPerRoute < 1 || maxInteractionsPerRoute > 20)) return runtimeInvalid("runtimeScan.interactionDiscovery.maxInteractionsPerRoute invalid");
    if (maxStatesPerRoute !== undefined && (typeof maxStatesPerRoute !== "number" || !Number.isInteger(maxStatesPerRoute) || maxStatesPerRoute < 2 || maxStatesPerRoute > 20)) return runtimeInvalid("runtimeScan.interactionDiscovery.maxStatesPerRoute invalid");
    if (timeoutMs !== undefined && (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000)) return runtimeInvalid("runtimeScan.interactionDiscovery.timeoutMs invalid");
    interactionDiscovery = { enabled: true, maxInteractionsPerRoute: typeof maxInteractionsPerRoute === "number" ? maxInteractionsPerRoute : undefined, maxStatesPerRoute: typeof maxStatesPerRoute === "number" ? maxStatesPerRoute : undefined, timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined };
  }
  return { ok: true, value: { enabled: true, baseUrl: baseUrl.value, routes, targets, discoveryMode: value.discoveryMode, viewportPreset: value.viewportPreset, auth: value.auth === undefined ? undefined : { ...(value.auth.useSavedState === true ? { useSavedState: true as const } : {}), ...(value.auth.promptOnRedirect === true ? { promptOnRedirect: true as const } : {}) }, interactionDiscovery } };
};

export const validateAuthStartRequest = (value: unknown): ValidationResult<AuthStartRequest> => {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST", message: "AuthStartRequest must be an object" };
  const keys = rejectUnknownKeys(value, ["projectPath", "baseUrl", "timeoutMs", "successSelector", "successUrlIncludes"]); if (!keys.ok) return keys;
  if (!isOptionalNonEmptyString(value.projectPath)) return { ok: false, code: "INVALID_REQUEST", message: "projectPath must be a non-empty string" };
  const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl); if (!baseUrl.ok) return baseUrl;
  const timeoutMs = value.timeoutMs;
  if (timeoutMs !== undefined && (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000)) return { ok: false, code: "INVALID_REQUEST", message: "timeoutMs must be 1000..300000" };
  if (value.successSelector !== undefined && (!isNonEmptyString(value.successSelector) || value.successSelector.length > 300)) return { ok: false, code: "INVALID_REQUEST", message: "successSelector is invalid" };
  if (value.successUrlIncludes !== undefined && (!isNonEmptyString(value.successUrlIncludes) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value.successUrlIncludes) || value.successUrlIncludes.startsWith("//") || value.successUrlIncludes.length > 300)) return { ok: false, code: "INVALID_REQUEST", message: "successUrlIncludes is invalid" };
  return { ok: true, value: { projectPath: value.projectPath, baseUrl: baseUrl.value, timeoutMs, successSelector: value.successSelector, successUrlIncludes: value.successUrlIncludes } };
};

const validateAuthError = (value: unknown): ValidationResult<AuthError> => {
  if (!isRecord(value)) return runtimeInvalid("auth error must be object");
  const keys = rejectUnknownKeys(value, ["code", "message"]); if (!keys.ok) return keys;
  if (!isAuthErrorCode(value.code) || !isNonEmptyString(value.message)) return runtimeInvalid("auth error invalid");
  return { ok: true, value: { code: value.code, message: value.message } };
};

const validateAuthStateSummary = (value: unknown): ValidationResult<AuthStateSummary> => {
  if (!isRecord(value)) return runtimeInvalid("auth state must be object");
  const keys = rejectUnknownKeys(value, ["exists", "valid", "savedAt", "updatedAt", "expiresAt", "storageStateRef"]); if (!keys.ok) return keys;
  if (typeof value.exists !== "boolean" || typeof value.valid !== "boolean") return runtimeInvalid("auth state flags invalid");
  if (!isOptionalString(value.savedAt) || !isOptionalString(value.updatedAt) || !isOptionalString(value.expiresAt)) return runtimeInvalid("auth state dates invalid");
  if (value.storageStateRef !== undefined && !isSafeArtifactRef(value.storageStateRef)) return runtimeInvalid("auth storageStateRef invalid");
  return { ok: true, value: { exists: value.exists, valid: value.valid, savedAt: value.savedAt, updatedAt: value.updatedAt, expiresAt: value.expiresAt, storageStateRef: value.storageStateRef } };
};

export const validateAuthStatusResponse = (value: unknown): ValidationResult<AuthStatusResponse> => {
  if (!isRecord(value)) return runtimeInvalid("AuthStatusResponse must be object");
  const keys = rejectUnknownKeys(value, ["status", "exists", "valid", "savedAt", "updatedAt", "expiresAt", "storageStateRef", "error"]); if (!keys.ok) return keys;
  if (value.status !== "missing" && value.status !== "valid" && value.status !== "invalid") return runtimeInvalid("auth status invalid");
  const summary = validateAuthStateSummary({ exists: value.exists, valid: value.valid, savedAt: value.savedAt, updatedAt: value.updatedAt, expiresAt: value.expiresAt, storageStateRef: value.storageStateRef }); if (!summary.ok) return summary;
  const error = value.error === undefined ? undefined : validateAuthError(value.error); if (error && !error.ok) return error;
  return { ok: true, value: { status: value.status, ...summary.value, error: error?.value } };
};

export const validateAuthStartResponse = (value: unknown): ValidationResult<AuthStartResponse> => {
  if (!isRecord(value)) return runtimeInvalid("AuthStartResponse must be object");
  const keys = rejectUnknownKeys(value, ["status", "authState", "error"]); if (!keys.ok) return keys;
  if (value.status !== "saved" && value.status !== "timeout" && value.status !== "failed") return runtimeInvalid("auth start status invalid");
  const authState = value.authState === undefined ? undefined : validateAuthStateSummary(value.authState); if (authState && !authState.ok) return authState;
  const error = value.error === undefined ? undefined : validateAuthError(value.error); if (error && !error.ok) return error;
  return { ok: true, value: { status: value.status, authState: authState?.value, error: error?.value } };
};

export const validateAuthClearResponse = (value: unknown): ValidationResult<AuthClearResponse> => {
  if (!isRecord(value)) return runtimeInvalid("AuthClearResponse must be object");
  const keys = rejectUnknownKeys(value, ["cleared", "status"]); if (!keys.ok) return keys;
  if (typeof value.cleared !== "boolean" || (value.status !== "cleared" && value.status !== "missing")) return runtimeInvalid("auth clear response invalid");
  return { ok: true, value: { cleared: value.cleared, status: value.status } };
};

const isProductionGraphNodeKind = (
  value: unknown,
): value is ProductionGraphNodeKind =>
  value === "file" ||
  value === "page" ||
  value === "component" ||
  value === "hook" ||
  value === "api-route" ||
  value === "api-client-method" ||
  value === "utility" ||
  value === "external-endpoint";

const isProductionGraphEdgeKind = (
  value: unknown,
): value is ProductionGraphEdgeKind =>
  value === "import" ||
  value === "render" ||
  value === "call" ||
  value === "http" ||
  value === "route";

const isGraphConfidence = (value: unknown): value is GraphConfidence =>
  value === "high" || value === "medium" || value === "low";

const rejectUnknownKeys = (
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): ValidationResult<void> => {
  const unknownKeys = Object.keys(value).filter(
    (key) => !allowedKeys.includes(key),
  );

  if (unknownKeys.length > 0) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: `Unknown request fields: ${unknownKeys.join(", ")}`,
      details: { unknownKeys },
    };
  }

  return { ok: true, value: undefined };
};

export const validateScanRequest = (
  value: unknown,
): ValidationResult<ScanRequest> => {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Request body must be an object",
    };
  }

  const keys = rejectUnknownKeys(value, ["projectPath", "runtimeScan"]);
  if (!keys.ok) return keys;

  const projectPath = value.projectPath;
  if (!isOptionalNonEmptyString(projectPath)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "projectPath must be a non-empty string",
    };
  }

  const runtimeScan = value.runtimeScan === undefined ? undefined : validateRuntimeScanRequest(value.runtimeScan);
  if (runtimeScan && !runtimeScan.ok) return runtimeScan;

  return {
    ok: true,
    value: { projectPath, ...(runtimeScan ? { runtimeScan: runtimeScan.value } : {}) },
  };
};

export const validateProjectPathQuery = (
  value: unknown,
): ValidationResult<ProjectPathQuery> => {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Query must be an object",
    };
  }

  const keys = rejectUnknownKeys(value, ["path", "projectPath"]);
  if (!keys.ok) return keys;

  if (value.path !== undefined && value.projectPath !== undefined) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Use either path or projectPath, not both",
    };
  }

  const projectPath = value.path ?? value.projectPath;
  if (Array.isArray(projectPath)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "path query must be a single string",
    };
  }
  if (!isOptionalNonEmptyString(projectPath)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "path query must be a non-empty string",
    };
  }
  return { ok: true, value: { path: projectPath, projectPath } };
};

export const validateGraphQuery = validateProjectPathQuery;

export const validateLatestReportQuery = validateProjectPathQuery;

export const validateRuntimeArtifactDetailQuery = validateProjectPathQuery;

export const validateRuntimeArtifactScreenshotQuery = (
  value: unknown,
): ValidationResult<RuntimeArtifactScreenshotQuery> => {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST", message: "Query must be an object" };
  const keys = rejectUnknownKeys(value, ["path", "projectPath", "ref"]); if (!keys.ok) return keys;
  if (value.path !== undefined && value.projectPath !== undefined) return { ok: false, code: "INVALID_REQUEST", message: "Use either path or projectPath, not both" };
  const projectPath = value.path ?? value.projectPath;
  if (Array.isArray(projectPath) || !isOptionalNonEmptyString(projectPath)) return { ok: false, code: "INVALID_REQUEST", message: "path query must be a single non-empty string" };
  if (!isSafeOpaqueScreenshotRef(value.ref)) return { ok: false, code: "INVALID_REQUEST", message: "screenshot ref is invalid" };
  return { ok: true, value: { path: projectPath, projectPath, ref: value.ref } };
};

const validateProjectSummary = (
  value: unknown,
): ValidationResult<ProjectSummary> => {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "project must be an object",
    };
  }

  if (!isNonEmptyString(value.name)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.name must be a non-empty string" };
  }
  if (!isNonEmptyString(value.rootDir)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.rootDir must be a non-empty string" };
  }
  if (!isNonEmptyString(value.lutestDir)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.lutestDir must be a non-empty string" };
  }
  if (typeof value.packageJsonExists !== "boolean") {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.packageJsonExists must be a boolean" };
  }
  if (
    value.detectedFramework !== "next" &&
    value.detectedFramework !== "vite-react" &&
    value.detectedFramework !== "react" &&
    value.detectedFramework !== "vue" &&
    value.detectedFramework !== "laravel" &&
    value.detectedFramework !== "php" &&
    value.detectedFramework !== "unknown" &&
    value.detectedFramework !== null
  ) {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.detectedFramework is invalid" };
  }
  if (
    value.sourceFileCount !== undefined &&
    typeof value.sourceFileCount !== "number"
  ) {
    return { ok: false, code: "SCHEMA_INVALID", message: "project.sourceFileCount must be a number" };
  }

  return {
    ok: true,
    value: {
      name: value.name,
      rootDir: value.rootDir,
      lutestDir: value.lutestDir,
      packageJsonExists: value.packageJsonExists,
      detectedFramework: value.detectedFramework,
      sourceFileCount: value.sourceFileCount,
    },
  };
};

const validateScanIssue = (value: unknown): ValidationResult<ScanIssue> => {
  if (!isRecord(value)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue must be an object" };
  }
  if (!isNonEmptyString(value.id)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue.id must be a non-empty string" };
  }
  if (!isScanIssueType(value.type)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue.type is invalid" };
  }
  if (!isScanIssueSeverity(value.severity)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue.severity is invalid" };
  }
  if (!isNonEmptyString(value.message)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue.message must be a non-empty string" };
  }
  if (!isOptionalNonEmptyString(value.filePath)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "issue.filePath must be a non-empty string" };
  }

  return {
    ok: true,
    value: {
      id: value.id,
      type: value.type,
      severity: value.severity,
      message: value.message,
      filePath: value.filePath,
    },
  };
};

const validateRuntimeViewport = (value: unknown): ValidationResult<RuntimeScanViewport> => {
  if (!isRecord(value)) return runtimeInvalid("runtime viewport is invalid");
  const keys = rejectUnknownKeys(value, ["width", "height"]); if (!keys.ok) return keys;
  if (!isFiniteNumber(value.width) || !Number.isInteger(value.width) || value.width <= 0 || !isFiniteNumber(value.height) || !Number.isInteger(value.height) || value.height <= 0) return runtimeInvalid("runtime viewport is invalid");
  return { ok: true, value: { width: value.width, height: value.height } };
};

const validateRuntimeRect = (value: unknown): ValidationResult<RuntimeRect> => {
  if (!isRecord(value)) return runtimeInvalid("runtime rect must be an object");
  const keys = rejectUnknownKeys(value, ["x", "y", "width", "height", "top", "right", "bottom", "left"]); if (!keys.ok) return keys;
  const { x, y, width, height, top, right, bottom, left } = value;
  if (!isFiniteNumber(x)) return runtimeInvalid("runtime rect.x must be finite");
  if (!isFiniteNumber(y)) return runtimeInvalid("runtime rect.y must be finite");
  if (!isFiniteNumber(width)) return runtimeInvalid("runtime rect.width must be finite");
  if (!isFiniteNumber(height)) return runtimeInvalid("runtime rect.height must be finite");
  if (!isFiniteNumber(top)) return runtimeInvalid("runtime rect.top must be finite");
  if (!isFiniteNumber(right)) return runtimeInvalid("runtime rect.right must be finite");
  if (!isFiniteNumber(bottom)) return runtimeInvalid("runtime rect.bottom must be finite");
  if (!isFiniteNumber(left)) return runtimeInvalid("runtime rect.left must be finite");
  if (width < 0 || height < 0) return runtimeInvalid("runtime rect dimensions must not be negative");
  return { ok: true, value: { x, y, width, height, top, right, bottom, left } };
};

const validateRuntimeReadabilityCoverage = (value: unknown): ValidationResult<RuntimeReadabilityCoverage> => {
  if (!isRecord(value)) return runtimeInvalid("runtime readability coverage must be object");
  const keys = rejectUnknownKeys(value, ["candidateTextCount", "checkedTextCount", "skippedTextCount", "skippedByReason", "incomplete"]); if (!keys.ok) return keys;
  if (!isCount(value.candidateTextCount) || !isCount(value.checkedTextCount) || !isCount(value.skippedTextCount) || typeof value.incomplete !== "boolean" || !isRecord(value.skippedByReason)) return runtimeInvalid("runtime readability coverage fields invalid");
  if (value.candidateTextCount !== value.checkedTextCount + value.skippedTextCount) return runtimeInvalid("runtime readability coverage count mismatch");
  const skippedByReason: Partial<Record<RuntimeReadabilitySkipReason, number>> = {};
  let reasonTotal = 0;
  for (const [reason, count] of Object.entries(value.skippedByReason)) {
    if (!isRuntimeReadabilitySkipReason(reason) || !isCount(count)) return runtimeInvalid("runtime readability skip reason invalid");
    skippedByReason[reason] = count;
    reasonTotal += count;
  }
  if (reasonTotal !== value.skippedTextCount) return runtimeInvalid("runtime readability skipped count mismatch");
  return { ok: true, value: { candidateTextCount: value.candidateTextCount, checkedTextCount: value.checkedTextCount, skippedTextCount: value.skippedTextCount, skippedByReason, incomplete: value.incomplete } };
};

const validateDomElementGeometry = (value: unknown): ValidationResult<DomElementGeometry> => {
  if (!isRecord(value)) return runtimeInvalid("dom element must be object");
  const keys = rejectUnknownKeys(value, ["internalId", "tagName", "selectorHint", "id", "className", "role", "ariaLabel", "textSnippet", "rect", "visibility", "textStyle", "focusBehavior", "clickable", "order"]); if (!keys.ok) return keys;
  if (!isNonEmptyString(value.internalId) || !isNonEmptyString(value.tagName)) return runtimeInvalid("dom element identity invalid");
  if (!isOptionalString(value.selectorHint) || !isOptionalString(value.textSnippet) || !isOptionalString(value.ariaLabel) || (isString(value.textSnippet) && value.textSnippet.length > 500) || (isString(value.ariaLabel) && value.ariaLabel.length > 500)) return runtimeInvalid("dom element text/selector invalid");
  if ((isString(value.textSnippet) && containsSensitiveRuntimeText(value.textSnippet)) || (isString(value.ariaLabel) && containsSensitiveRuntimeText(value.ariaLabel))) return runtimeInvalid("dom element sensitive text evidence invalid");
  const rect = validateRuntimeRect(value.rect); if (!rect.ok) return rect;
  if (!isRecord(value.visibility) || !rejectUnknownKeys(value.visibility, ["display", "visibility", "opacity"]).ok || !isString(value.visibility.display) || !isString(value.visibility.visibility) || !isFiniteNumber(value.visibility.opacity) || value.visibility.opacity < 0 || value.visibility.opacity > 1) return runtimeInvalid("dom element visibility invalid");
  const textStyle = value.textStyle;
  if (textStyle !== undefined) {
    if (!isRecord(textStyle) || !rejectUnknownKeys(textStyle, ["foregroundColor", "backgroundColor", "fontSizePx", "fontWeight", "largeText"]).ok || !isHexColor(textStyle.foregroundColor) || !isHexColor(textStyle.backgroundColor) || !isFiniteNumber(textStyle.fontSizePx) || textStyle.fontSizePx <= 0 || !isFiniteNumber(textStyle.fontWeight) || textStyle.fontWeight < 1 || textStyle.fontWeight > 1000 || typeof textStyle.largeText !== "boolean") return runtimeInvalid("dom element text style invalid");
    const expectedLargeText = textStyle.fontSizePx >= WCAG_LARGE_TEXT_MIN_FONT_SIZE_PX || (textStyle.fontSizePx >= WCAG_LARGE_BOLD_TEXT_MIN_FONT_SIZE_PX && textStyle.fontWeight >= WCAG_LARGE_BOLD_TEXT_MIN_FONT_WEIGHT);
    if (textStyle.largeText !== expectedLargeText) return runtimeInvalid("dom element large text classification invalid");
  }
  let focusBehavior: DomElementGeometry["focusBehavior"];
  if (value.focusBehavior !== undefined) {
    if (!isRecord(value.focusBehavior) || !rejectUnknownKeys(value.focusBehavior, ["visibleOnFocus", "rect"]).ok || typeof value.focusBehavior.visibleOnFocus !== "boolean") return runtimeInvalid("dom element focus behavior invalid");
    const focusRect = value.focusBehavior.rect === undefined ? undefined : validateRuntimeRect(value.focusBehavior.rect); if (focusRect && !focusRect.ok) return focusRect;
    focusBehavior = { visibleOnFocus: value.focusBehavior.visibleOnFocus, rect: focusRect?.value };
  }
  if (typeof value.clickable !== "boolean" || !isCount(value.order)) return runtimeInvalid("dom element clickable/order invalid");
  return { ok: true, value: { internalId: value.internalId, tagName: value.tagName, selectorHint: value.selectorHint, id: isOptionalString(value.id) ? value.id : undefined, className: isOptionalString(value.className) ? value.className : undefined, role: isOptionalString(value.role) ? value.role : undefined, ariaLabel: isOptionalString(value.ariaLabel) ? value.ariaLabel : undefined, textSnippet: value.textSnippet, rect: rect.value, visibility: { display: value.visibility.display, visibility: value.visibility.visibility, opacity: value.visibility.opacity }, textStyle: isRecord(textStyle) ? { foregroundColor: String(textStyle.foregroundColor), backgroundColor: String(textStyle.backgroundColor), fontSizePx: Number(textStyle.fontSizePx), fontWeight: Number(textStyle.fontWeight), largeText: Boolean(textStyle.largeText) } : undefined, focusBehavior, clickable: value.clickable, order: value.order } };
};

export const validateDomGeometry = (value: unknown): ValidationResult<DomGeometry> => {
  if (!isRecord(value)) return runtimeInvalid("domGeometry must be object");
  const keys = rejectUnknownKeys(value, ["viewport", "capturedAt", "elementCount", "truncated", "readabilityCoverage", "elements"]); if (!keys.ok) return keys;
  const viewport = validateRuntimeViewport(value.viewport); if (!viewport.ok) return viewport;
  if (!isNonEmptyString(value.capturedAt) || !isCount(value.elementCount) || typeof value.truncated !== "boolean" || !Array.isArray(value.elements)) return runtimeInvalid("domGeometry metadata invalid");
  const elements: DomElementGeometry[] = [];
  for (const rawElement of value.elements) { const element = validateDomElementGeometry(rawElement); if (!element.ok) return element; elements.push(element.value); }
  if (value.elementCount !== elements.length) return runtimeInvalid("domGeometry element count mismatch");
  const readabilityCoverage = value.readabilityCoverage === undefined ? undefined : validateRuntimeReadabilityCoverage(value.readabilityCoverage); if (readabilityCoverage && !readabilityCoverage.ok) return readabilityCoverage;
  if (readabilityCoverage && readabilityCoverage.value.incomplete !== value.truncated) return runtimeInvalid("domGeometry readability completeness mismatch");
  return { ok: true, value: { viewport: viewport.value, capturedAt: value.capturedAt, elementCount: value.elementCount, truncated: value.truncated, readabilityCoverage: readabilityCoverage?.value, elements } };
};

export const validateRuntimeLayoutIssue = (value: unknown): ValidationResult<RuntimeLayoutIssue> => {
  if (!isRecord(value)) return runtimeInvalid("layout issue must be object");
  const keys = rejectUnknownKeys(value, ["id", "type", "code", "severity", "message", "scanTargetId", "route", "viewport", "elementRef", "evidence"]); if (!keys.ok) return keys;
  if (!isNonEmptyString(value.id) || !isRuntimeLayoutIssueType(value.type) || !isScanIssueSeverity(value.severity) || !isNonEmptyString(value.message) || !isNonEmptyString(value.scanTargetId) || !isLocalRoute(value.route) || !isNonEmptyString(value.elementRef)) return runtimeInvalid("layout issue fields invalid");
  const code = value.code;
  if (code !== undefined && code !== value.type) return runtimeInvalid("layout issue code must equal type");
  const viewport = validateRuntimeViewport(value.viewport); if (!viewport.ok) return viewport;
  if (!isRecord(value.evidence) || !isNonEmptyString(value.evidence.threshold)) return runtimeInvalid("layout issue evidence invalid");
  const evidenceKeys = rejectUnknownKeys(value.evidence, ["selectorHint", "boundingBox", "relatedElementRef", "relatedSelectorHint", "relatedBoundingBox", "overlapArea", "overlapRatio", "viewport", "screenshotPath", "threshold", "foregroundColor", "backgroundColor", "contrastRatio", "requiredContrastRatio", "foregroundOklch", "backgroundOklch", "oklchDelta", "suggestedForegroundColor", "suggestedBackgroundColor", "suggestionReason"]); if (!evidenceKeys.ok) return evidenceKeys;
  if (value.evidence.screenshotPath !== undefined) return runtimeInvalid("public layout issue screenshotPath must not expose internal paths");
  const boundingBox = validateRuntimeRect(value.evidence.boundingBox); if (!boundingBox.ok) return boundingBox;
  const evidenceViewport = validateRuntimeViewport(value.evidence.viewport); if (!evidenceViewport.ok) return evidenceViewport;
  const relatedBoundingBox = value.evidence.relatedBoundingBox === undefined ? undefined : validateRuntimeRect(value.evidence.relatedBoundingBox); if (relatedBoundingBox && !relatedBoundingBox.ok) return relatedBoundingBox;
  const overlapArea = value.evidence.overlapArea;
  const overlapRatio = value.evidence.overlapRatio;
  const foregroundColor = value.evidence.foregroundColor;
  const backgroundColor = value.evidence.backgroundColor;
  const contrastRatio = value.evidence.contrastRatio;
  const requiredContrastRatio = value.evidence.requiredContrastRatio;
  const hasContrastEvidence = foregroundColor !== undefined || backgroundColor !== undefined || contrastRatio !== undefined || requiredContrastRatio !== undefined;
  if (hasContrastEvidence && (!isHexColor(foregroundColor) || !isHexColor(backgroundColor) || !isContrastRatio(contrastRatio) || !isRequiredContrastRatio(requiredContrastRatio) || contrastRatio >= requiredContrastRatio)) return runtimeInvalid("layout issue contrast evidence invalid");
  const hasOklchEvidence = value.evidence.foregroundOklch !== undefined || value.evidence.backgroundOklch !== undefined || value.evidence.oklchDelta !== undefined;
  const foregroundOklch = hasOklchEvidence ? validateRuntimeOklchColorEvidence(value.evidence.foregroundOklch) : undefined; if (foregroundOklch && !foregroundOklch.ok) return foregroundOklch;
  const backgroundOklch = hasOklchEvidence ? validateRuntimeOklchColorEvidence(value.evidence.backgroundOklch) : undefined; if (backgroundOklch && !backgroundOklch.ok) return backgroundOklch;
  const delta = hasOklchEvidence ? validateRuntimeOklchDeltaEvidence(value.evidence.oklchDelta) : undefined; if (delta && !delta.ok) return delta;
  const hasSuggestion = value.evidence.suggestedForegroundColor !== undefined || value.evidence.suggestedBackgroundColor !== undefined || value.evidence.suggestionReason !== undefined;
  if (hasSuggestion && (!hasContrastEvidence || (!isHexColor(value.evidence.suggestedForegroundColor) && !isHexColor(value.evidence.suggestedBackgroundColor)) || !isPublicSafeDetailText(value.evidence.suggestionReason))) return runtimeInvalid("layout issue contrast suggestion invalid");
  if (isHexColor(value.evidence.suggestedForegroundColor) && isHexColor(backgroundColor) && isRequiredContrastRatio(requiredContrastRatio) && hexContrastRatio(value.evidence.suggestedForegroundColor, backgroundColor) < requiredContrastRatio) return runtimeInvalid("suggested foreground contrast invalid");
  if (isHexColor(value.evidence.suggestedBackgroundColor) && isHexColor(foregroundColor) && isRequiredContrastRatio(requiredContrastRatio) && hexContrastRatio(foregroundColor, value.evidence.suggestedBackgroundColor) < requiredContrastRatio) return runtimeInvalid("suggested background contrast invalid");
  if (value.type === "low-text-contrast" && !hasContrastEvidence) return runtimeInvalid("low contrast issue evidence required");
  if (value.type !== "low-text-contrast" && (hasContrastEvidence || hasOklchEvidence || hasSuggestion)) return runtimeInvalid("contrast evidence only allowed for low contrast issue");
  return { ok: true, value: { id: value.id, type: value.type, code: isRuntimeLayoutIssueType(code) ? code : undefined, severity: value.severity, message: value.message, scanTargetId: value.scanTargetId, route: value.route, viewport: viewport.value, elementRef: value.elementRef, evidence: { selectorHint: isOptionalString(value.evidence.selectorHint) ? value.evidence.selectorHint : undefined, boundingBox: boundingBox.value, relatedElementRef: isOptionalString(value.evidence.relatedElementRef) ? value.evidence.relatedElementRef : undefined, relatedSelectorHint: isOptionalString(value.evidence.relatedSelectorHint) ? value.evidence.relatedSelectorHint : undefined, relatedBoundingBox: relatedBoundingBox?.value, overlapArea: isFiniteNumber(overlapArea) ? overlapArea : undefined, overlapRatio: isFiniteNumber(overlapRatio) ? overlapRatio : undefined, viewport: evidenceViewport.value, screenshotPath: isOptionalString(value.evidence.screenshotPath) ? value.evidence.screenshotPath : undefined, threshold: value.evidence.threshold, foregroundColor: hasContrastEvidence ? String(foregroundColor) : undefined, backgroundColor: hasContrastEvidence ? String(backgroundColor) : undefined, contrastRatio: hasContrastEvidence ? Number(contrastRatio) : undefined, requiredContrastRatio: hasContrastEvidence ? Number(requiredContrastRatio) : undefined, foregroundOklch: foregroundOklch?.ok ? foregroundOklch.value : undefined, backgroundOklch: backgroundOklch?.ok ? backgroundOklch.value : undefined, oklchDelta: delta?.ok ? delta.value : undefined, suggestedForegroundColor: isHexColor(value.evidence.suggestedForegroundColor) ? value.evidence.suggestedForegroundColor : undefined, suggestedBackgroundColor: isHexColor(value.evidence.suggestedBackgroundColor) ? value.evidence.suggestedBackgroundColor : undefined, suggestionReason: isPublicSafeDetailText(value.evidence.suggestionReason) ? value.evidence.suggestionReason : undefined } } };
};

const validateRuntimeError = (value: unknown): ValidationResult<RuntimeScanError> => {
  if (!isRecord(value) || !isRuntimeErrorCode(value.code) || !isNonEmptyString(value.message)) return runtimeInvalid("runtime error invalid");
  const viewport = value.viewport === undefined ? undefined : validateRuntimeViewport(value.viewport); if (viewport && !viewport.ok) return viewport;
  const stepIndex = value.stepIndex;
  return { ok: true, value: { code: value.code, message: value.message, targetId: isOptionalString(value.targetId) ? value.targetId : undefined, viewport: viewport?.value, stepIndex: typeof stepIndex === "number" && Number.isInteger(stepIndex) ? stepIndex : undefined } };
};

const validateRuntimeInteractionSource = (value: unknown): ValidationResult<RuntimeInteractionSource> => {
  if (!isRecord(value)) return runtimeInvalid("runtime interaction source must be object");
  const keys = rejectUnknownKeys(value, ["candidateId", "kind", "label", "action"]); if (!keys.ok) return keys;
  if (!isSafeId(value.candidateId) || !isRuntimeInteractionControlKind(value.kind) || !isPublicSafeDetailText(value.label) || value.action !== "click") return runtimeInvalid("runtime interaction source invalid");
  return { ok: true, value: { candidateId: value.candidateId, kind: value.kind, label: value.label, action: "click" } };
};

const validateRuntimeSkippedInteraction = (value: unknown): ValidationResult<RuntimeSkippedInteraction> => {
  if (!isRecord(value)) return runtimeInvalid("runtime skipped interaction must be object");
  const keys = rejectUnknownKeys(value, ["candidateId", "kind", "label", "reason"]); if (!keys.ok) return keys;
  if (!isSafeId(value.candidateId) || (value.kind !== undefined && !isRuntimeInteractionControlKind(value.kind)) || (value.label !== undefined && !isPublicSafeDetailText(value.label)) || !isRuntimeInteractionSkipReason(value.reason)) return runtimeInvalid("runtime skipped interaction invalid");
  return { ok: true, value: { candidateId: value.candidateId, kind: isRuntimeInteractionControlKind(value.kind) ? value.kind : undefined, label: isPublicSafeDetailText(value.label) ? value.label : undefined, reason: value.reason } };
};

const validateRuntimeStateFields = (value: Record<string, unknown>, required = false): ValidationResult<Pick<RuntimeViewportResult, "stateId" | "stateLabel" | "stateDedupKey" | "interactionSource" | "skippedInteractions">> => {
  const hasState = value.stateId !== undefined || value.stateLabel !== undefined || value.stateDedupKey !== undefined;
  if ((required || hasState) && (!isSafeId(value.stateId) || !isPublicSafeDetailText(value.stateLabel) || !isSafeId(value.stateDedupKey))) return runtimeInvalid("runtime viewport state fields invalid");
  const interactionSource = value.interactionSource === undefined ? undefined : validateRuntimeInteractionSource(value.interactionSource); if (interactionSource && !interactionSource.ok) return interactionSource;
  if (value.skippedInteractions !== undefined && !Array.isArray(value.skippedInteractions)) return runtimeInvalid("runtime skipped interactions invalid");
  const skippedInteractions: RuntimeSkippedInteraction[] = [];
  for (const rawSkipped of value.skippedInteractions ?? []) { const skipped = validateRuntimeSkippedInteraction(rawSkipped); if (!skipped.ok) return skipped; skippedInteractions.push(skipped.value); }
  return { ok: true, value: { stateId: isSafeId(value.stateId) ? value.stateId : undefined, stateLabel: isPublicSafeDetailText(value.stateLabel) ? value.stateLabel : undefined, stateDedupKey: isSafeId(value.stateDedupKey) ? value.stateDedupKey : undefined, interactionSource: interactionSource?.value, skippedInteractions } };
};

const validateRuntimeViewportResult = (value: unknown): ValidationResult<RuntimeViewportResult> => {
  if (!isRecord(value)) return runtimeInvalid("runtime viewport result must be object");
  const keys = rejectUnknownKeys(value, ["viewport", "stateId", "stateLabel", "stateDedupKey", "interactionSource", "skippedInteractions", "readabilityCoverage", "screenshotPath", "domGeometry", "layoutIssues", "consoleErrors", "pageErrors", "networkErrors", "failedResponses", "errors"]); if (!keys.ok) return keys;
  const viewport = validateRuntimeViewport(value.viewport); if (!viewport.ok) return viewport;
  if (value.screenshotPath !== undefined) return runtimeInvalid("public runtime viewport screenshotPath must not expose internal paths");
  const state = validateRuntimeStateFields(value); if (!state.ok) return state;
  const domGeometry = value.domGeometry === undefined ? undefined : validateDomGeometry(value.domGeometry); if (domGeometry && !domGeometry.ok) return domGeometry;
  const readabilityCoverage = value.readabilityCoverage === undefined ? undefined : validateRuntimeReadabilityCoverage(value.readabilityCoverage); if (readabilityCoverage && !readabilityCoverage.ok) return readabilityCoverage;
  if (!Array.isArray(value.layoutIssues) || !Array.isArray(value.consoleErrors) || !Array.isArray(value.pageErrors) || !Array.isArray(value.networkErrors) || !Array.isArray(value.failedResponses) || !Array.isArray(value.errors)) return runtimeInvalid("runtime viewport arrays invalid");
  const layoutIssues: RuntimeLayoutIssue[] = []; for (const rawIssue of value.layoutIssues) { const issue = validateRuntimeLayoutIssue(rawIssue); if (!issue.ok) return issue; layoutIssues.push(issue.value); }
  const errors: RuntimeScanError[] = []; for (const rawError of value.errors) { const error = validateRuntimeError(rawError); if (!error.ok) return error; errors.push(error.value); }
  return { ok: true, value: { viewport: viewport.value, ...state.value, readabilityCoverage: readabilityCoverage?.value, screenshotPath: isOptionalString(value.screenshotPath) ? value.screenshotPath : undefined, domGeometry: domGeometry?.value, layoutIssues, consoleErrors: value.consoleErrors.filter(isString), pageErrors: value.pageErrors.filter(isString), networkErrors: value.networkErrors.filter(isString), failedResponses: value.failedResponses.filter(isString), errors } };
};

const validateRuntimeTargetResult = (value: unknown): ValidationResult<RuntimeTargetResult> => {
  if (!isRecord(value) || !isNonEmptyString(value.scanTargetId) || (value.kind !== "route" && value.kind !== "state" && value.kind !== "flow") || !isLocalRoute(value.route) || !isScanStatus(value.status) || !Array.isArray(value.viewportResults) || !Array.isArray(value.errors)) return runtimeInvalid("runtime target result invalid");
  const viewportResults: RuntimeViewportResult[] = []; for (const rawViewport of value.viewportResults) { const viewport = validateRuntimeViewportResult(rawViewport); if (!viewport.ok) return viewport; viewportResults.push(viewport.value); }
  const errors: RuntimeScanError[] = []; for (const rawError of value.errors) { const error = validateRuntimeError(rawError); if (!error.ok) return error; errors.push(error.value); }
  return { ok: true, value: { scanTargetId: value.scanTargetId, kind: value.kind, route: value.route, name: isOptionalString(value.name) ? value.name : undefined, status: value.status, viewportResults, executionSteps: Array.isArray(value.executionSteps) ? value.executionSteps as RuntimeExecutionStep[] : undefined, errors } };
};

export const validateRuntimeScanResult = (value: unknown): ValidationResult<RuntimeScanResult> => {
  if (!isRecord(value) || !isNonEmptyString(value.scanId) || !isScanStatus(value.status) || !isNonEmptyString(value.startedAt) || !isNonEmptyString(value.finishedAt) || !isFiniteNumber(value.durationMs)) return runtimeInvalid("runtime scan result metadata invalid");
  const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl); if (!baseUrl.ok) return runtimeInvalid(baseUrl.message);
  if (!Array.isArray(value.targets) || !Array.isArray(value.targetResults) || !Array.isArray(value.errors) || !isRecord(value.summary)) return runtimeInvalid("runtime scan result arrays invalid");
  const targets: RuntimeResultTarget[] = []; for (const rawTarget of value.targets) { const target = validateRuntimeResultTarget(rawTarget); if (!target.ok) return target; targets.push(target.value); }
  const targetResults: RuntimeTargetResult[] = []; for (const rawResult of value.targetResults) { const result = validateRuntimeTargetResult(rawResult); if (!result.ok) return result; targetResults.push(result.value); }
  const errors: RuntimeScanError[] = []; for (const rawError of value.errors) { const error = validateRuntimeError(rawError); if (!error.ok) return error; errors.push(error.value); }
  const { targetCount, viewportCount, screenshotCount, issueCount, errorCount } = value.summary;
  if (!isCount(targetCount)) return runtimeInvalid("runtime summary.targetCount invalid");
  if (!isCount(viewportCount)) return runtimeInvalid("runtime summary.viewportCount invalid");
  if (!isCount(screenshotCount)) return runtimeInvalid("runtime summary.screenshotCount invalid");
  if (!isCount(issueCount)) return runtimeInvalid("runtime summary.issueCount invalid");
  if (!isCount(errorCount)) return runtimeInvalid("runtime summary.errorCount invalid");
  return { ok: true, value: { scanId: value.scanId, status: value.status, startedAt: value.startedAt, finishedAt: value.finishedAt, durationMs: value.durationMs, baseUrl: baseUrl.value, targets, targetResults, summary: { targetCount, viewportCount, screenshotCount, issueCount, errorCount }, errors } };
};

export const validateRuntimeArtifactScreenshotEvidence = (value: unknown): ValidationResult<RuntimeArtifactScreenshotEvidence> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact screenshot must be object");
  const keys = rejectUnknownKeys(value, ["available", "ref", "missingReason"]); if (!keys.ok) return keys;
  if (typeof value.available !== "boolean") return runtimeInvalid("runtime artifact screenshot.available invalid");
  if (value.available) {
    if (!isSafeOpaqueScreenshotRef(value.ref) || value.missingReason !== undefined) return runtimeInvalid("available runtime screenshot must have opaque ref only");
    return { ok: true, value: { available: true, ref: value.ref } };
  }
  if (value.ref !== undefined || !isRuntimeScreenshotMissingReason(value.missingReason)) return runtimeInvalid("missing runtime screenshot must have missingReason only");
  return { ok: true, value: { available: false, missingReason: value.missingReason } };
};

const validateRuntimeArtifactIssueEvidence = (value: unknown, issueType: RuntimeLayoutIssueType): ValidationResult<RuntimeArtifactIssueEvidence> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact issue evidence must be object");
  const keys = rejectUnknownKeys(value, ["scanTargetId", "route", "stateId", "stateLabel", "viewport", "selector", "elementRef", "boundingBox", "relatedBoundingBox", "screenshot", "reason", "foregroundColor", "backgroundColor", "contrastRatio", "requiredContrastRatio", "foregroundOklch", "backgroundOklch", "oklchDelta", "suggestedForegroundColor", "suggestedBackgroundColor", "suggestionReason", "dedupKey", "stateDedupKey"]); if (!keys.ok) return keys;
  if (!isSafeId(value.scanTargetId) || !isLocalRoute(value.route) || !isSafeId(value.elementRef) || !isSafeId(value.dedupKey)) return runtimeInvalid("runtime artifact issue evidence identity invalid");
  if (value.stateId !== undefined && !isSafeId(value.stateId)) return runtimeInvalid("runtime artifact issue stateId invalid");
  if (value.stateDedupKey !== undefined && !isSafeId(value.stateDedupKey)) return runtimeInvalid("runtime artifact issue stateDedupKey invalid");
  if (value.stateLabel !== undefined && !isPublicSafeDetailText(value.stateLabel)) return runtimeInvalid("runtime artifact issue stateLabel invalid");
  if (value.selector !== undefined && (!isNonEmptyString(value.selector) || value.selector.includes("\0") || value.selector.includes(".lutest") || /^[a-zA-Z]:[\\/]/.test(value.selector))) return runtimeInvalid("runtime artifact issue selector invalid");
  if (!isPublicSafeDetailText(value.reason)) return runtimeInvalid("runtime artifact issue reason invalid");
  const viewport = validateRuntimeViewport(value.viewport); if (!viewport.ok) return viewport;
  const boundingBox = validateRuntimeRect(value.boundingBox); if (!boundingBox.ok) return boundingBox;
  const relatedBoundingBox = value.relatedBoundingBox === undefined ? undefined : validateRuntimeRect(value.relatedBoundingBox); if (relatedBoundingBox && !relatedBoundingBox.ok) return relatedBoundingBox;
  const screenshot = validateRuntimeArtifactScreenshotEvidence(value.screenshot); if (!screenshot.ok) return screenshot;
  const hasContrastEvidence = value.foregroundColor !== undefined || value.backgroundColor !== undefined || value.contrastRatio !== undefined || value.requiredContrastRatio !== undefined;
  if (hasContrastEvidence && (!isHexColor(value.foregroundColor) || !isHexColor(value.backgroundColor) || !isContrastRatio(value.contrastRatio) || !isRequiredContrastRatio(value.requiredContrastRatio) || value.contrastRatio >= value.requiredContrastRatio)) return runtimeInvalid("runtime artifact contrast evidence invalid");
  const hasOklchEvidence = value.foregroundOklch !== undefined || value.backgroundOklch !== undefined || value.oklchDelta !== undefined;
  const foregroundOklch = hasOklchEvidence ? validateRuntimeOklchColorEvidence(value.foregroundOklch) : undefined; if (foregroundOklch && !foregroundOklch.ok) return foregroundOklch;
  const backgroundOklch = hasOklchEvidence ? validateRuntimeOklchColorEvidence(value.backgroundOklch) : undefined; if (backgroundOklch && !backgroundOklch.ok) return backgroundOklch;
  const delta = hasOklchEvidence ? validateRuntimeOklchDeltaEvidence(value.oklchDelta) : undefined; if (delta && !delta.ok) return delta;
  const hasSuggestion = value.suggestedForegroundColor !== undefined || value.suggestedBackgroundColor !== undefined || value.suggestionReason !== undefined;
  if (hasSuggestion && (!hasContrastEvidence || (!isHexColor(value.suggestedForegroundColor) && !isHexColor(value.suggestedBackgroundColor)) || !isPublicSafeDetailText(value.suggestionReason))) return runtimeInvalid("runtime artifact contrast suggestion invalid");
  if (isHexColor(value.suggestedForegroundColor) && isHexColor(value.backgroundColor) && isRequiredContrastRatio(value.requiredContrastRatio) && hexContrastRatio(value.suggestedForegroundColor, value.backgroundColor) < value.requiredContrastRatio) return runtimeInvalid("runtime artifact suggested foreground contrast invalid");
  if (isHexColor(value.suggestedBackgroundColor) && isHexColor(value.foregroundColor) && isRequiredContrastRatio(value.requiredContrastRatio) && hexContrastRatio(value.foregroundColor, value.suggestedBackgroundColor) < value.requiredContrastRatio) return runtimeInvalid("runtime artifact suggested background contrast invalid");
  if (issueType === "low-text-contrast" && !hasContrastEvidence) return runtimeInvalid("runtime artifact low contrast evidence required");
  if (issueType !== "low-text-contrast" && (hasContrastEvidence || hasOklchEvidence || hasSuggestion)) return runtimeInvalid("runtime artifact contrast evidence issue type invalid");
  return { ok: true, value: {
    scanTargetId: value.scanTargetId,
    route: value.route,
    stateId: isSafeId(value.stateId) ? value.stateId : undefined,
    stateLabel: isPublicSafeDetailText(value.stateLabel) ? value.stateLabel : undefined,
    viewport: viewport.value,
    selector: isNonEmptyString(value.selector) ? value.selector : undefined,
    elementRef: value.elementRef,
    boundingBox: boundingBox.value,
    relatedBoundingBox: relatedBoundingBox?.value,
    screenshot: screenshot.value,
    reason: value.reason,
    foregroundColor: hasContrastEvidence ? String(value.foregroundColor) : undefined,
    backgroundColor: hasContrastEvidence ? String(value.backgroundColor) : undefined,
    contrastRatio: hasContrastEvidence ? Number(value.contrastRatio) : undefined,
    requiredContrastRatio: hasContrastEvidence ? Number(value.requiredContrastRatio) : undefined,
    foregroundOklch: foregroundOklch?.ok ? foregroundOklch.value : undefined,
    backgroundOklch: backgroundOklch?.ok ? backgroundOklch.value : undefined,
    oklchDelta: delta?.ok ? delta.value : undefined,
    suggestedForegroundColor: isHexColor(value.suggestedForegroundColor) ? value.suggestedForegroundColor : undefined,
    suggestedBackgroundColor: isHexColor(value.suggestedBackgroundColor) ? value.suggestedBackgroundColor : undefined,
    suggestionReason: isPublicSafeDetailText(value.suggestionReason) ? value.suggestionReason : undefined,
    dedupKey: value.dedupKey,
    stateDedupKey: isSafeId(value.stateDedupKey) ? value.stateDedupKey : undefined,
  } };
};

const validateRuntimeArtifactIssueDetail = (value: unknown): ValidationResult<RuntimeArtifactIssueDetail> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact issue must be object");
  const keys = rejectUnknownKeys(value, ["id", "type", "severity", "message", "evidence"]); if (!keys.ok) return keys;
  if (!isSafeId(value.id) || !isRuntimeLayoutIssueType(value.type) || !isScanIssueSeverity(value.severity) || !isPublicSafeDetailText(value.message)) return runtimeInvalid("runtime artifact issue fields invalid");
  const evidence = validateRuntimeArtifactIssueEvidence(value.evidence, value.type); if (!evidence.ok) return evidence;
  return { ok: true, value: { id: value.id, type: value.type, severity: value.severity, message: value.message, evidence: evidence.value } };
};

const validateRuntimeArtifactDiagnostic = (value: unknown): ValidationResult<RuntimeArtifactDiagnostic> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact diagnostic must be object");
  const keys = rejectUnknownKeys(value, ["kind", "message"]); if (!keys.ok) return keys;
  if (!isRuntimeArtifactDiagnosticKind(value.kind) || !isPublicSafeDetailText(value.message)) return runtimeInvalid("runtime artifact diagnostic fields invalid");
  return { ok: true, value: { kind: value.kind, message: value.message } };
};

const validateRuntimeArtifactViewportDetail = (value: unknown): ValidationResult<RuntimeArtifactViewportDetail> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact viewport must be object");
  const keys = rejectUnknownKeys(value, ["viewport", "stateId", "stateLabel", "stateDedupKey", "interactionSource", "skippedInteractions", "readabilityCoverage", "screenshot", "diagnostics", "issues"]); if (!keys.ok) return keys;
  const viewport = validateRuntimeViewport(value.viewport); if (!viewport.ok) return viewport;
  const state = validateRuntimeStateFields(value); if (!state.ok) return state;
  const screenshot = validateRuntimeArtifactScreenshotEvidence(value.screenshot); if (!screenshot.ok) return screenshot;
  const readabilityCoverage = value.readabilityCoverage === undefined ? undefined : validateRuntimeReadabilityCoverage(value.readabilityCoverage); if (readabilityCoverage && !readabilityCoverage.ok) return readabilityCoverage;
  if (!Array.isArray(value.diagnostics) || !Array.isArray(value.issues)) return runtimeInvalid("runtime artifact viewport collections invalid");
  const diagnostics: RuntimeArtifactDiagnostic[] = [];
  for (const rawDiagnostic of value.diagnostics) { const diagnostic = validateRuntimeArtifactDiagnostic(rawDiagnostic); if (!diagnostic.ok) return diagnostic; diagnostics.push(diagnostic.value); }
  const issues: RuntimeArtifactIssueDetail[] = [];
  for (const rawIssue of value.issues) { const issue = validateRuntimeArtifactIssueDetail(rawIssue); if (!issue.ok) return issue; issues.push(issue.value); }
  return { ok: true, value: { viewport: viewport.value, stateId: state.value.stateId, stateLabel: state.value.stateLabel, stateDedupKey: state.value.stateDedupKey, interactionSource: state.value.interactionSource, skippedInteractions: state.value.skippedInteractions, readabilityCoverage: readabilityCoverage?.value, screenshot: screenshot.value, diagnostics, issues } };
};

const validateRuntimeArtifactTargetDetail = (value: unknown): ValidationResult<RuntimeArtifactTargetDetail> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact target must be object");
  const keys = rejectUnknownKeys(value, ["scanTargetId", "kind", "route", "stateId", "stateLabel", "status", "viewportResults"]); if (!keys.ok) return keys;
  if (!isSafeId(value.scanTargetId) || (value.kind !== "route" && value.kind !== "state" && value.kind !== "flow") || !isLocalRoute(value.route) || !isScanStatus(value.status) || !Array.isArray(value.viewportResults)) return runtimeInvalid("runtime artifact target fields invalid");
  if (value.stateId !== undefined && !isSafeId(value.stateId)) return runtimeInvalid("runtime artifact target stateId invalid");
  if (value.stateLabel !== undefined && !isPublicSafeDetailText(value.stateLabel)) return runtimeInvalid("runtime artifact target stateLabel invalid");
  const viewportResults: RuntimeArtifactViewportDetail[] = [];
  for (const rawViewport of value.viewportResults) { const viewport = validateRuntimeArtifactViewportDetail(rawViewport); if (!viewport.ok) return viewport; viewportResults.push(viewport.value); }
  return { ok: true, value: {
    scanTargetId: value.scanTargetId,
    kind: value.kind,
    route: value.route,
    stateId: isSafeId(value.stateId) ? value.stateId : undefined,
    stateLabel: isPublicSafeDetailText(value.stateLabel) ? value.stateLabel : undefined,
    status: value.status,
    viewportResults,
  } };
};

export const validateRuntimeArtifactDetailResponse = (value: unknown): ValidationResult<RuntimeArtifactDetailResponse> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact detail must be object");
  const keys = rejectUnknownKeys(value, ["scanId", "status", "startedAt", "finishedAt", "durationMs", "baseUrl", "summary", "targetResults"]); if (!keys.ok) return keys;
  if (!isSafeId(value.scanId) || !isScanStatus(value.status) || !isNonEmptyString(value.startedAt) || !isNonEmptyString(value.finishedAt) || !isFiniteNumber(value.durationMs)) return runtimeInvalid("runtime artifact detail metadata invalid");
  const baseUrl = validateLocalRuntimeBaseUrl(value.baseUrl); if (!baseUrl.ok) return runtimeInvalid(baseUrl.message);
  if (!isRecord(value.summary) || !Array.isArray(value.targetResults)) return runtimeInvalid("runtime artifact detail collections invalid");
  const targetResults: RuntimeArtifactTargetDetail[] = [];
  for (const rawTarget of value.targetResults) { const target = validateRuntimeArtifactTargetDetail(rawTarget); if (!target.ok) return target; targetResults.push(target.value); }
  const { targetCount, viewportCount, screenshotCount, issueCount, errorCount } = value.summary;
  if (!isCount(targetCount) || !isCount(viewportCount) || !isCount(screenshotCount) || !isCount(issueCount) || !isCount(errorCount)) return runtimeInvalid("runtime artifact detail summary invalid");
  const actualViewportCount = new Set(targetResults.flatMap((target) => target.viewportResults.map((viewport) => `${target.scanTargetId}:${viewport.viewport.width}x${viewport.viewport.height}`))).size;
  const actualScreenshotCount = targetResults.reduce((sum, target) => sum + target.viewportResults.filter((viewport) => viewport.screenshot.available).length, 0);
  const actualIssueCount = targetResults.reduce((sum, target) => sum + target.viewportResults.reduce((inner, viewport) => inner + viewport.issues.length, 0), 0);
  if (targetCount !== targetResults.length || viewportCount !== actualViewportCount || screenshotCount !== actualScreenshotCount || issueCount !== actualIssueCount) return runtimeInvalid("runtime artifact detail summary mismatch");
  return { ok: true, value: {
    scanId: value.scanId,
    status: value.status,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    durationMs: value.durationMs,
    baseUrl: baseUrl.value,
    summary: { targetCount, viewportCount, screenshotCount, issueCount, errorCount },
    targetResults,
  } };
};

export const validateRuntimeArtifactMeta = (value: unknown): ValidationResult<RuntimeArtifactMeta> => {
  if (!isRecord(value)) return runtimeInvalid("runtime artifact meta must be object");
  const keys = rejectUnknownKeys(value, ["scanId", "savedAt", "schemaVersion", "artifactVersion", "targetCount", "viewportCount", "screenshotCount", "issueCount", "errorCount"]); if (!keys.ok) return keys;
  if (!isNonEmptyString(value.scanId) || !isNonEmptyString(value.savedAt) || !isNonEmptyString(value.schemaVersion)) return runtimeInvalid("runtime artifact meta strings invalid");
  const { artifactVersion, targetCount, viewportCount, screenshotCount, issueCount, errorCount } = value;
  if (!isCount(targetCount)) return runtimeInvalid("runtime artifact meta.targetCount invalid");
  if (!isCount(viewportCount)) return runtimeInvalid("runtime artifact meta.viewportCount invalid");
  if (!isCount(screenshotCount)) return runtimeInvalid("runtime artifact meta.screenshotCount invalid");
  if (!isCount(issueCount)) return runtimeInvalid("runtime artifact meta.issueCount invalid");
  if (artifactVersion !== undefined && !isCount(artifactVersion)) return runtimeInvalid("runtime artifact meta.artifactVersion invalid");
  if (errorCount !== undefined && !isCount(errorCount)) return runtimeInvalid("runtime artifact meta.errorCount invalid");
  return { ok: true, value: { scanId: value.scanId, savedAt: value.savedAt, schemaVersion: value.schemaVersion, artifactVersion, targetCount, viewportCount, screenshotCount, issueCount, errorCount } };
};

const isArtifactRefKind = (value: unknown): value is ArtifactRefKind =>
  value === "static-report" || value === "production-graph" || value === "runtime-scan" || value === "runtime-scan-meta" || value === "screenshot";

const isSafeArtifactRef = (value: unknown): value is string =>
  isNonEmptyString(value) && !value.includes("\0") && !value.includes("\\") && !value.includes("..") && !value.startsWith("/") && !/^[a-zA-Z]:/.test(value) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

export const validateArtifactRef = (value: unknown): ValidationResult<ArtifactRef> => {
  if (!isRecord(value)) return runtimeInvalid("artifact ref must be object");
  const keys = rejectUnknownKeys(value, ["kind", "ref", "label", "sizeBytes", "generatedAt"]); if (!keys.ok) return keys;
  if (!isArtifactRefKind(value.kind) || !isSafeArtifactRef(value.ref)) return runtimeInvalid("artifact ref invalid");
  if (!isOptionalString(value.label) || !isOptionalString(value.generatedAt)) return runtimeInvalid("artifact ref labels invalid");
  if (value.sizeBytes !== undefined && !isCount(value.sizeBytes)) return runtimeInvalid("artifact ref sizeBytes invalid");
  return { ok: true, value: { kind: value.kind, ref: value.ref, label: value.label, sizeBytes: value.sizeBytes, generatedAt: value.generatedAt } };
};

const validateLatestStaticScanSummary = (value: unknown): ValidationResult<LatestStaticScanSummary> => {
  if (!isRecord(value)) return runtimeInvalid("static scan summary must be object");
  const keys = rejectUnknownKeys(value, ["status", "issueCount", "errorCount", "warningCount", "infoCount", "sourceFileCount", "reportRef"]); if (!keys.ok) return keys;
  if (!isScanStatus(value.status) || !isCount(value.issueCount) || !isCount(value.errorCount) || !isCount(value.warningCount) || !isCount(value.infoCount) || !isCount(value.sourceFileCount)) return runtimeInvalid("static scan summary invalid");
  const reportRef = value.reportRef === undefined ? undefined : validateArtifactRef(value.reportRef); if (reportRef && !reportRef.ok) return reportRef;
  return { ok: true, value: { status: value.status, issueCount: value.issueCount, errorCount: value.errorCount, warningCount: value.warningCount, infoCount: value.infoCount, sourceFileCount: value.sourceFileCount, reportRef: reportRef?.value } };
};

const validateIssueCountRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every(isCount);

const validateLatestRuntimeIssueSummary = (value: unknown): ValidationResult<LatestRuntimeIssueSummary> => {
  if (!isRecord(value)) return runtimeInvalid("runtime issue summary must be object");
  const keys = rejectUnknownKeys(value, ["total", "bySeverity", "byType"]); if (!keys.ok) return keys;
  if (!isCount(value.total) || !validateIssueCountRecord(value.bySeverity) || !validateIssueCountRecord(value.byType)) return runtimeInvalid("runtime issue summary invalid");
  const severityTotal = Object.values(value.bySeverity).reduce((sum, count) => sum + count, 0);
  const typeTotal = Object.values(value.byType).reduce((sum, count) => sum + count, 0);
  if (severityTotal !== value.total || typeTotal !== value.total) return runtimeInvalid("runtime issue summary total mismatch");
  return { ok: true, value: { total: value.total, bySeverity: value.bySeverity, byType: value.byType } };
};

const validateLatestRuntimeScanSummary = (value: unknown): ValidationResult<LatestRuntimeScanSummary> => {
  if (!isRecord(value)) return runtimeInvalid("runtime scan summary must be object");
  const keys = rejectUnknownKeys(value, ["status", "targetCount", "viewportCount", "screenshotCount", "issueCount", "errorCount", "issueSummary", "artifactRef", "meta"]); if (!keys.ok) return keys;
  if (!isScanStatus(value.status) || !isCount(value.targetCount) || !isCount(value.viewportCount) || !isCount(value.screenshotCount) || !isCount(value.issueCount) || !isCount(value.errorCount)) return runtimeInvalid("runtime scan summary invalid");
  const issueSummary = validateLatestRuntimeIssueSummary(value.issueSummary); if (!issueSummary.ok) return issueSummary;
  if (issueSummary.value.total !== value.issueCount) return runtimeInvalid("runtime issue count mismatch");
  const artifactRef = value.artifactRef === undefined ? undefined : validateArtifactRef(value.artifactRef); if (artifactRef && !artifactRef.ok) return artifactRef;
  const meta = value.meta === undefined ? undefined : validateRuntimeArtifactMeta(value.meta); if (meta && !meta.ok) return meta;
  return { ok: true, value: { status: value.status, targetCount: value.targetCount, viewportCount: value.viewportCount, screenshotCount: value.screenshotCount, issueCount: value.issueCount, errorCount: value.errorCount, issueSummary: issueSummary.value, artifactRef: artifactRef?.value, meta: meta?.value } };
};

const validateLatestProductionGraphSummary = (value: unknown): ValidationResult<LatestProductionGraphSummary> => {
  if (!isRecord(value)) return runtimeInvalid("production graph summary must be object");
  const keys = rejectUnknownKeys(value, ["summary", "artifactRef"]); if (!keys.ok) return keys;
  const artifactRef = value.artifactRef === undefined ? undefined : validateArtifactRef(value.artifactRef); if (artifactRef && !artifactRef.ok) return artifactRef;
  if (value.summary !== undefined && !isRecord(value.summary)) return runtimeInvalid("production graph summary invalid");
  return { ok: true, value: { summary: value.summary as ProductionGraphSummary | undefined, artifactRef: artifactRef?.value } };
};

const validateLatestReportProjectMeta = (value: unknown): ValidationResult<LatestReportProjectMeta> => {
  if (!isRecord(value)) return runtimeInvalid("latest report project must be object");
  const keys = rejectUnknownKeys(value, ["name", "selectedRootRef", "selectedRootLabel"]); if (!keys.ok) return keys;
  if (!isOptionalString(value.name) || !isOptionalString(value.selectedRootLabel)) return runtimeInvalid("latest report project labels invalid");
  if (value.selectedRootRef !== undefined && !isSafeArtifactRef(value.selectedRootRef)) return runtimeInvalid("latest report selectedRootRef invalid");
  return { ok: true, value: { name: value.name, selectedRootRef: value.selectedRootRef, selectedRootLabel: value.selectedRootLabel } };
};

export const validateLatestReportResponse = (
  value: unknown,
): ValidationResult<LatestReportResponse> => {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "LatestReportResponse must be an object",
    };
  }

  const state = value.state;
  if (!isLatestReportState(state)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "state is invalid" };
  }

  if (state === "valid") {
    const keys = rejectUnknownKeys(value, ["state", "report", "generatedAt", "project", "staticScan", "productionGraph", "runtimeScanSummary", "artifactRefs", "runtimeScan", "runtimeArtifactMeta"]); if (!keys.ok) return keys;
    const report = validateScanResponse(value.report);
    if (!report.ok) return report;
    if (value.generatedAt !== undefined && !isNonEmptyString(value.generatedAt)) return runtimeInvalid("latest report generatedAt invalid");
    const project = value.project === undefined ? undefined : validateLatestReportProjectMeta(value.project); if (project && !project.ok) return project;
    const staticScan = value.staticScan === undefined ? undefined : validateLatestStaticScanSummary(value.staticScan); if (staticScan && !staticScan.ok) return staticScan;
    const productionGraph = value.productionGraph === undefined || value.productionGraph === null ? undefined : validateLatestProductionGraphSummary(value.productionGraph); if (productionGraph && !productionGraph.ok) return productionGraph;
    const runtimeScanSummary = value.runtimeScanSummary === undefined || value.runtimeScanSummary === null ? undefined : validateLatestRuntimeScanSummary(value.runtimeScanSummary); if (runtimeScanSummary && !runtimeScanSummary.ok) return runtimeScanSummary;
    if (value.artifactRefs !== undefined && !Array.isArray(value.artifactRefs)) return runtimeInvalid("latest report artifactRefs invalid");
    const artifactRefs: ArtifactRef[] | undefined = value.artifactRefs === undefined ? undefined : [];
    if (artifactRefs) for (const rawRef of value.artifactRefs as unknown[]) { const ref = validateArtifactRef(rawRef); if (!ref.ok) return ref; artifactRefs.push(ref.value); }
    const runtimeScan = value.runtimeScan === undefined || value.runtimeScan === null ? undefined : validateRuntimeScanResult(value.runtimeScan);
    if (runtimeScan && !runtimeScan.ok) return runtimeScan;
    const runtimeArtifactMeta = value.runtimeArtifactMeta === undefined || value.runtimeArtifactMeta === null ? undefined : validateRuntimeArtifactMeta(value.runtimeArtifactMeta);
    if (runtimeArtifactMeta && !runtimeArtifactMeta.ok) return runtimeArtifactMeta;

    return {
      ok: true,
      value: {
        state: "valid",
        report: report.value,
        ...(value.generatedAt !== undefined ? { generatedAt: value.generatedAt } : {}),
        ...(project ? { project: project.value } : {}),
        ...(staticScan ? { staticScan: staticScan.value } : {}),
        ...(productionGraph ? { productionGraph: productionGraph.value } : value.productionGraph === null ? { productionGraph: null } : {}),
        ...(runtimeScanSummary ? { runtimeScanSummary: runtimeScanSummary.value } : value.runtimeScanSummary === null ? { runtimeScanSummary: null } : {}),
        ...(artifactRefs ? { artifactRefs } : {}),
        ...(runtimeScan ? { runtimeScan: runtimeScan.value } : value.runtimeScan === null ? { runtimeScan: null } : {}),
        ...(runtimeArtifactMeta ? { runtimeArtifactMeta: runtimeArtifactMeta.value } : value.runtimeArtifactMeta === null ? { runtimeArtifactMeta: null } : {}),
      },
    };
  }

  if (value.report !== null) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "report must be null when latest report is missing",
    };
  }

  const keys = rejectUnknownKeys(value, ["state", "report", "runtimeScan", "runtimeArtifactMeta"]); if (!keys.ok) return keys;
  return { ok: true, value: { state: "missing", report: null, ...(value.runtimeScan === null ? { runtimeScan: null } : {}), ...(value.runtimeArtifactMeta === null ? { runtimeArtifactMeta: null } : {}) } };
};
export const validateScanResponse = (
  value: unknown,
): ValidationResult<ScanResponse> => {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "ScanResponse must be an object",
    };
  }

  const scanId = value.scanId;
  const startedAt = value.startedAt;
  const finishedAt = value.finishedAt;
  const reportPath = value.reportPath;
  if (!isNonEmptyString(scanId)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "scanId must be a non-empty string",
    };
  }
  if (!isNonEmptyString(startedAt)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "startedAt must be a non-empty string",
    };
  }
  if (!isNonEmptyString(finishedAt)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "finishedAt must be a non-empty string",
    };
  }
  if (!isNonEmptyString(reportPath)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "reportPath must be a non-empty string",
    };
  }

  const status = value.status;
  if (!isScanStatus(status)) {
    return { ok: false, code: "SCHEMA_INVALID", message: "status is invalid" };
  }

  const project = validateProjectSummary(value.project);
  if (!project.ok) return project;

  if (typeof value.sourceFileCount !== "number") {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "sourceFileCount must be a number",
    };
  }

  const rawIssues = value.issues;
  if (!Array.isArray(rawIssues)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "issues must be an array",
    };
  }

  const issues: ScanIssue[] = [];
  for (const rawIssue of rawIssues) {
    const issue = validateScanIssue(rawIssue);
    if (!issue.ok) return issue;
    issues.push(issue.value);
  }
  const runtimeScan = value.runtimeScan === undefined || value.runtimeScan === null ? undefined : validateRuntimeScanResult(value.runtimeScan);
  if (runtimeScan && !runtimeScan.ok) return runtimeScan;

  return {
    ok: true,
    value: {
      scanId,
      startedAt,
      finishedAt,
      status,
      project: project.value,
      sourceFileCount: value.sourceFileCount,
      issues,
      reportPath,
      ...(runtimeScan ? { runtimeScan: runtimeScan.value } : value.runtimeScan === null ? { runtimeScan: null } : {}),
    },
  };
};





const schemaInvalid = <T>(message: string): ValidationResult<T> => ({
  ok: false,
  code: "SCHEMA_INVALID",
  message,
});

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const validateProductionGraphLoc = (
  value: unknown,
): ValidationResult<ProductionGraphLoc> => {
  if (!isRecord(value)) return schemaInvalid("loc must be an object");
  const startLine = value.startLine;
  const endLine = value.endLine;
  if (!isCount(startLine) || startLine < 1) {
    return schemaInvalid("loc.startLine must be a positive integer");
  }
  if (!isCount(endLine) || endLine < startLine) {
    return schemaInvalid("loc.endLine must be greater than or equal to startLine");
  }
  return { ok: true, value: { startLine, endLine } };
};

const validateProductionGraphRouteInfo = (
  value: unknown,
): ValidationResult<ProductionGraphRouteInfo> => {
  if (!isRecord(value)) return schemaInvalid("route must be an object");
  const routePath = value.path;
  const kind = value.kind;
  if (!isNonEmptyString(routePath)) {
    return schemaInvalid("route.path must be a non-empty string");
  }
  if (kind !== "page" && kind !== "api") {
    return schemaInvalid("route.kind must be page or api");
  }
  return { ok: true, value: { path: routePath, kind } };
};

const validateProductionGraphHttpInfo = (
  value: unknown,
): ValidationResult<ProductionGraphHttpInfo> => {
  if (!isRecord(value)) return schemaInvalid("http must be an object");
  const method = value.method;
  const httpPath = value.path;
  if (!isOptionalNonEmptyString(method)) {
    return schemaInvalid("http.method must be a non-empty string");
  }
  if (!isOptionalNonEmptyString(httpPath)) {
    return schemaInvalid("http.path must be a non-empty string");
  }
  return { ok: true, value: { method, path: httpPath } };
};

export const validateProductionGraphNode = (
  input: unknown,
): ValidationResult<ProductionGraphNode> => {
  if (!isRecord(input)) return schemaInvalid("ProductionGraphNode must be an object");

  const id = input.id;
  const kind = input.kind;
  const name = input.name;
  const filePath = input.filePath;
  const confidence = input.confidence;
  const reason = input.reason;

  if (!isNonEmptyString(id)) return schemaInvalid("node.id must be a non-empty string");
  if (!isProductionGraphNodeKind(kind)) return schemaInvalid("node.kind is invalid");
  if (!isNonEmptyString(name)) return schemaInvalid("node.name must be a non-empty string");
  if (!isOptionalNonEmptyString(filePath)) return schemaInvalid("node.filePath must be a non-empty string");
  if (!isGraphConfidence(confidence)) return schemaInvalid("node.confidence is invalid");
  if (!isNonEmptyString(reason)) return schemaInvalid("node.reason must be a non-empty string");

  let loc: ProductionGraphLoc | undefined;
  if (input.loc !== undefined) {
    const validation = validateProductionGraphLoc(input.loc);
    if (!validation.ok) return validation;
    loc = validation.value;
  }

  let route: ProductionGraphRouteInfo | undefined;
  if (input.route !== undefined) {
    const validation = validateProductionGraphRouteInfo(input.route);
    if (!validation.ok) return validation;
    route = validation.value;
  }

  let http: ProductionGraphHttpInfo | undefined;
  if (input.http !== undefined) {
    const validation = validateProductionGraphHttpInfo(input.http);
    if (!validation.ok) return validation;
    http = validation.value;
  }

  return {
    ok: true,
    value: { id, kind, name, filePath, loc, route, http, confidence, reason },
  };
};

export const validateProductionGraphEdge = (
  input: unknown,
): ValidationResult<ProductionGraphEdge> => {
  if (!isRecord(input)) return schemaInvalid("ProductionGraphEdge must be an object");

  const id = input.id;
  const kind = input.kind;
  const source = input.source;
  const target = input.target;
  const confidence = input.confidence;
  const reason = input.reason;

  if (!isNonEmptyString(id)) return schemaInvalid("edge.id must be a non-empty string");
  if (!isProductionGraphEdgeKind(kind)) return schemaInvalid("edge.kind is invalid");
  if (!isNonEmptyString(source)) return schemaInvalid("edge.source must be a non-empty string");
  if (!isNonEmptyString(target)) return schemaInvalid("edge.target must be a non-empty string");
  if (!isGraphConfidence(confidence)) return schemaInvalid("edge.confidence is invalid");
  if (!isNonEmptyString(reason)) return schemaInvalid("edge.reason must be a non-empty string");

  return { ok: true, value: { id, kind, source, target, confidence, reason } };
};

const validateProductionGraphSummary = (
  input: unknown,
): ValidationResult<ProductionGraphSummary> => {
  if (!isRecord(input)) return schemaInvalid("ProductionGraphSummary must be an object");

  const fileCount = input.fileCount;
  const pageCount = input.pageCount;
  const componentCount = input.componentCount;
  const hookCount = input.hookCount;
  const apiRouteCount = input.apiRouteCount;
  const apiClientMethodCount = input.apiClientMethodCount;
  const externalEndpointCount = input.externalEndpointCount;
  const edgeCount = input.edgeCount;

  if (!isCount(fileCount)) return schemaInvalid("summary.fileCount must be a non-negative integer");
  if (!isCount(pageCount)) return schemaInvalid("summary.pageCount must be a non-negative integer");
  if (!isCount(componentCount)) return schemaInvalid("summary.componentCount must be a non-negative integer");
  if (!isCount(hookCount)) return schemaInvalid("summary.hookCount must be a non-negative integer");
  if (!isCount(apiRouteCount)) return schemaInvalid("summary.apiRouteCount must be a non-negative integer");
  if (!isCount(apiClientMethodCount)) return schemaInvalid("summary.apiClientMethodCount must be a non-negative integer");
  if (!isCount(externalEndpointCount)) return schemaInvalid("summary.externalEndpointCount must be a non-negative integer");
  if (!isCount(edgeCount)) return schemaInvalid("summary.edgeCount must be a non-negative integer");

  return {
    ok: true,
    value: {
      fileCount,
      pageCount,
      componentCount,
      hookCount,
      apiRouteCount,
      apiClientMethodCount,
      externalEndpointCount,
      edgeCount,
    },
  };
};

export const validateProductionGraphResponse = (
  input: unknown,
): ValidationResult<ProductionGraphResponse> => {
  if (!isRecord(input)) return schemaInvalid("ProductionGraphResponse must be an object");
  if (input.mode !== "symbol-level") return schemaInvalid("graph.mode must be symbol-level");
  if (!Array.isArray(input.nodes)) return schemaInvalid("graph.nodes must be an array");
  if (!Array.isArray(input.edges)) return schemaInvalid("graph.edges must be an array");

  const nodes: ProductionGraphNode[] = [];
  for (const rawNode of input.nodes) {
    const validation = validateProductionGraphNode(rawNode);
    if (!validation.ok) return validation;
    nodes.push(validation.value);
  }

  const edges: ProductionGraphEdge[] = [];
  for (const rawEdge of input.edges) {
    const validation = validateProductionGraphEdge(rawEdge);
    if (!validation.ok) return validation;
    edges.push(validation.value);
  }

  const summaryValidation = validateProductionGraphSummary(input.summary);
  if (!summaryValidation.ok) return summaryValidation;
  const summary = summaryValidation.value;

  const countedSummary: ProductionGraphSummary = {
    fileCount: nodes.filter((node) => node.kind === "file").length,
    pageCount: nodes.filter((node) => node.kind === "page").length,
    componentCount: nodes.filter((node) => node.kind === "component").length,
    hookCount: nodes.filter((node) => node.kind === "hook").length,
    apiRouteCount: nodes.filter((node) => node.kind === "api-route").length,
    apiClientMethodCount: nodes.filter((node) => node.kind === "api-client-method").length,
    externalEndpointCount: nodes.filter((node) => node.kind === "external-endpoint").length,
    edgeCount: edges.length,
  };

  for (const [key, expected] of Object.entries(countedSummary)) {
    if (summary[key as keyof ProductionGraphSummary] !== expected) {
      return schemaInvalid(`summary.${key} does not match graph contents`);
    }
  }

  return { ok: true, value: { mode: "symbol-level", nodes, edges, summary } };
};

