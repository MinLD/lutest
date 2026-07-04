export type ErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "SCHEMA_INVALID"
  | "PATH_NOT_ALLOWED"
  | "REPORT_MALFORMED"
  | "REPORT_SCHEMA_INVALID"
  | "REPORT_PERMISSION_DENIED";

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

export type LatestReportResponse =
  | { state: "missing"; report: null }
  | { state: "valid"; report: ScanResponse };

export interface ScanRequest {
  projectPath?: string;
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
  value === "REPORT_MALFORMED" ||
  value === "REPORT_SCHEMA_INVALID" ||
  value === "REPORT_PERMISSION_DENIED";

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

  const keys = rejectUnknownKeys(value, ["projectPath"]);
  if (!keys.ok) return keys;

  const projectPath = value.projectPath;
  if (!isOptionalNonEmptyString(projectPath)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "projectPath must be a non-empty string",
    };
  }

  return {
    ok: true,
    value: { projectPath },
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
    const report = validateScanResponse(value.report);
    if (!report.ok) return report;

    return {
      ok: true,
      value: { state: "valid", report: report.value },
    };
  }

  if (value.report !== null) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "report must be null when latest report is missing",
    };
  }

  return { ok: true, value: { state: "missing", report: null } };
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

