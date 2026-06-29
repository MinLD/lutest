export type ErrorCode = "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR" | "SCHEMA_INVALID" | "PATH_NOT_ALLOWED";
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
export interface ReportSummary {
    scanId: string;
    createdAt: string;
    status: "passed" | "failed" | "warning";
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
}
export interface LatestReportResponse {
    report: ScanResponse | null;
}
export interface ScanRequest {
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
export declare const validateProjectPathQuery: (value: unknown) => ValidationResult<string | undefined>;
export declare const validateScanResponse: (value: unknown) => ValidationResult<ScanResponse>;
