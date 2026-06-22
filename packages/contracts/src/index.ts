export interface ApiErrorResponse {
  error: {
    code: string;
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
  | "unknown";

export interface ProjectSummary {
  name: string;
  rootDir: string;
  tlxDir: string;
  packageJsonExists: boolean;
  detectedFramework: DetectedFramework;
}

export type GraphNodeType =
  | "project"
  | "page"
  | "route"
  | "component"
  | "api"
  | "asset"
  | "unknown";

export type GraphEdgeType =
  | "contains"
  | "import"
  | "render"
  | "call"
  | "depend";

export interface GraphNode<TData = Record<string, unknown>> {
  id: string;
  type: GraphNodeType;
  label: string;
  data?: TData;
}

export interface GraphEdge<TData = Record<string, unknown>> {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  data?: TData;
}

export interface GraphResponse<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
> {
  nodes: GraphNode<TNodeData>[];
  edges: GraphEdge<TEdgeData>[];
  generatedAt: string;
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

export interface ScanIssue {
  id: string;
  type: "layout" | "console" | "network" | "accessibility" | "unknown";
  severity: "critical" | "warning" | "info";
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

export interface SourceFileNodeData {
  filePath: string;
  relativePath: string;
  extension: string;
}

export interface ImportEdgeData {
  importPath: string;
  resolvedPath?: string;
}
