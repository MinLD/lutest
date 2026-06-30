export type ErrorCode = "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR" | "SCHEMA_INVALID" | "PATH_NOT_ALLOWED" | "REPORT_MALFORMED" | "REPORT_SCHEMA_INVALID" | "REPORT_PERMISSION_DENIED";
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
} | {
    state: "valid";
    report: ScanResponse;
};
export interface ScanRequest {
    projectPath?: string;
}
export interface ProjectPathQuery {
    path?: string;
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
export declare const validateScanRequest: (value: unknown) => ValidationResult<ScanRequest>;
export declare const validateProjectPathQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateGraphQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateLatestReportQuery: (value: unknown) => ValidationResult<ProjectPathQuery>;
export declare const validateLatestReportResponse: (value: unknown) => ValidationResult<LatestReportResponse>;
export declare const validateScanResponse: (value: unknown) => ValidationResult<ScanResponse>;
export declare const validateProductionGraphNode: (input: unknown) => ValidationResult<ProductionGraphNode>;
export declare const validateProductionGraphEdge: (input: unknown) => ValidationResult<ProductionGraphEdge>;
export declare const validateProductionGraphResponse: (input: unknown) => ValidationResult<ProductionGraphResponse>;
