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

  const keys = rejectUnknownKeys(value, ["path"]);
  if (!keys.ok) return keys;

  const projectPath = value.path;
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
  return { ok: true, value: { path: projectPath } };
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


