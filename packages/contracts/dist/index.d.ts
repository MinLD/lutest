export type ErrorCode = "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR" | "SCHEMA_INVALID" | "PATH_NOT_ALLOWED" | "CONFIG_ERROR" | "BASE_URL_NOT_LOCAL" | "PLAYWRIGHT_BROWSER_MISSING" | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" | "ROUTE_DISCOVERY_ERROR" | "TARGET_EXECUTION_ERROR" | "ROUTE_SCAN_ERROR" | "ARTIFACT_WRITE_ERROR" | "RUNTIME_SCAN_FAILED" | "REPORT_MALFORMED" | "REPORT_SCHEMA_INVALID" | "REPORT_PERMISSION_DENIED";
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
export type DetectedFramework = "next" | "vite-react" | "react" | "vue" | "laravel" | "php" | "unknown" | null;
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
export type ProductionGraphNodeKind = "file" | "page" | "component" | "hook" | "api-route" | "api-client-method" | "utility" | "external-endpoint";
export type ProductionGraphEdgeKind = "import" | "render" | "call" | "http" | "route";
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
export type LatestReportResponse = {
    state: "missing";
    report: null;
    runtimeScan?: null;
    runtimeArtifactMeta?: null;
} | {
    state: "valid";
    report: ScanResponse;
    runtimeScan?: RuntimeScanResult | null;
    runtimeArtifactMeta?: RuntimeArtifactMeta | null;
};
export interface ScanRequest {
    projectPath?: string;
    runtimeScan?: RuntimeScanRequest;
}
export interface ProjectPathQuery {
    path?: string;
    projectPath?: string;
}
export type ScanIssueType = "console" | "syntax" | "overflow" | "todo" | "large-file" | "maintainability" | "unknown";
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
export type RuntimeFlowStep = {
    kind: "goto";
    route: string;
} | {
    kind: "click";
    selector: string;
    allowDestructive?: boolean;
} | {
    kind: "fill";
    selector: string;
    value?: string;
    valueFromEnv?: string;
} | {
    kind: "waitForSelector";
    selector: string;
} | {
    kind: "waitForTimeout";
    timeoutMs: number;
} | {
    kind: "screenshotMarker";
    label: string;
};
export type RuntimeResultFlowStep = Exclude<RuntimeFlowStep, {
    kind: "fill";
}> | {
    kind: "fill";
    selector: string;
    redacted: true;
    valueSource?: "direct" | "env";
    valueFromEnv?: string;
};
export type RuntimeScanTarget = {
    id: string;
    kind: "route";
    route: string;
    name?: string;
} | {
    id: string;
    kind: "state";
    route: string;
    name?: string;
    steps: RuntimeFlowStep[];
} | {
    id: string;
    kind: "flow";
    route: string;
    name?: string;
    steps: RuntimeFlowStep[];
};
export type RuntimeResultTarget = {
    id: string;
    kind: "route";
    route: string;
    name?: string;
} | {
    id: string;
    kind: "state";
    route: string;
    name?: string;
    steps: RuntimeResultFlowStep[];
} | {
    id: string;
    kind: "flow";
    route: string;
    name?: string;
    steps: RuntimeResultFlowStep[];
};
export interface RuntimeScanRequest {
    enabled: true;
    baseUrl: string;
    routes?: string[];
    targets?: RuntimeScanTarget[];
    discoveryMode?: RuntimeDiscoveryMode;
    viewportPreset?: "default";
}
export interface RuntimeScanViewport {
    width: number;
    height: number;
}
export interface RuntimeRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
}
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
    visibility: {
        display: string;
        visibility: string;
        opacity: number;
    };
    clickable: boolean;
    order: number;
}
export interface DomGeometry {
    viewport: RuntimeScanViewport;
    capturedAt: string;
    elementCount: number;
    truncated: boolean;
    elements: DomElementGeometry[];
}
export type RuntimeLayoutIssueType = "horizontal-overflow" | "element-outside-viewport" | "small-click-target" | "suspicious-overlap" | "zero-size-visible-element";
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
    };
}
export type RuntimeErrorCode = "CONFIG_ERROR" | "PATH_NOT_ALLOWED" | "BASE_URL_NOT_LOCAL" | "PLAYWRIGHT_BROWSER_MISSING" | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED" | "ROUTE_DISCOVERY_ERROR" | "TARGET_EXECUTION_ERROR" | "ROUTE_SCAN_ERROR" | "ARTIFACT_WRITE_ERROR" | "RUNTIME_SCAN_FAILED" | "RUNTIME_BASE_URL_NOT_ALLOWED" | "RUNTIME_SCAN_ARTIFACT_INVALID" | "RUNTIME_SCAN_ARTIFACT_MALFORMED" | "RUNTIME_FLOW_ENV_VALUE_MISSING" | "RUNTIME_FLOW_DESTRUCTIVE_ACTION_BLOCKED" | "RUNTIME_LAYOUT_ISSUE_DETECTION_FAILED";
export interface RuntimeScanError {
    code: RuntimeErrorCode;
    message: string;
    targetId?: string;
    viewport?: RuntimeScanViewport;
    stepIndex?: number;
}
export interface RuntimeViewportResult {
    viewport: RuntimeScanViewport;
    screenshotPath?: string;
    domGeometry?: DomGeometry;
    layoutIssues: RuntimeLayoutIssue[];
    consoleErrors: string[];
    pageErrors: string[];
    networkErrors: string[];
    failedResponses: string[];
    errors: RuntimeScanError[];
}
export interface RuntimeExecutionStep {
    kind: RuntimeFlowStep["kind"];
    selector?: string;
    status: "passed" | "failed";
    durationMs: number;
    redacted?: boolean;
    valueSource?: "direct" | "env";
    valueFromEnv?: string;
    code?: RuntimeErrorCode;
    message?: string;
}
export interface RuntimeTargetResult {
    scanTargetId: string;
    kind: RuntimeTargetKind;
    route: string;
    name?: string;
    status: "passed" | "failed" | "warning";
    viewportResults: RuntimeViewportResult[];
    executionSteps?: RuntimeExecutionStep[];
    errors: RuntimeScanError[];
}
export interface RuntimeScanResult {
    scanId: string;
    status: "passed" | "failed" | "warning";
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    baseUrl: string;
    targets: RuntimeResultTarget[];
    targetResults: RuntimeTargetResult[];
    summary: {
        targetCount: number;
        viewportCount: number;
        screenshotCount: number;
        issueCount: number;
        errorCount: number;
    };
    errors: RuntimeScanError[];
}
export interface RuntimeArtifactMeta {
    scanId: string;
    savedAt: string;
    schemaVersion: string;
    artifactVersion?: number;
    targetCount: number;
    viewportCount: number;
    screenshotCount: number;
    issueCount: number;
    errorCount?: number;
}
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
export type ValidationResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    code: "INVALID_REQUEST" | "SCHEMA_INVALID";
    message: string;
    details?: unknown;
};
export declare const validateRuntimeScanRequest: (value: unknown) => ValidationResult<RuntimeScanRequest>;
export declare const validateScanRequest: (value: unknown) => ValidationResult<ScanRequest>;
export declare const validateProjectPathQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateGraphQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateLatestReportQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateDomGeometry: (value: unknown) => ValidationResult<DomGeometry>;
export declare const validateRuntimeLayoutIssue: (value: unknown) => ValidationResult<RuntimeLayoutIssue>;
export declare const validateRuntimeScanResult: (value: unknown) => ValidationResult<RuntimeScanResult>;
export declare const validateRuntimeArtifactMeta: (value: unknown) => ValidationResult<RuntimeArtifactMeta>;
export declare const validateLatestReportResponse: (value: unknown) => ValidationResult<LatestReportResponse>;
export declare const validateScanResponse: (value: unknown) => ValidationResult<ScanResponse>;
export declare const validateProductionGraphNode: (input: unknown) => ValidationResult<ProductionGraphNode>;
export declare const validateProductionGraphEdge: (input: unknown) => ValidationResult<ProductionGraphEdge>;
export declare const validateProductionGraphResponse: (input: unknown) => ValidationResult<ProductionGraphResponse>;
