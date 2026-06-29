export type ErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "SCHEMA_INVALID"
  | "PATH_NOT_ALLOWED";

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

export type LatestReportState =
  | "missing"
  | "malformed"
  | "schema-invalid"
  | "valid";

export type LatestReportResponse =
  | { state: "missing"; report: null; error: ApiErrorResponse["error"] }
  | { state: "malformed"; report: null; error: ApiErrorResponse["error"] }
  | { state: "schema-invalid"; report: null; error: ApiErrorResponse["error"] }
  | { state: "valid"; report: ScanResponse };

export interface ScanRequest {
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

  if (value.projectPath !== undefined && !isNonEmptyString(value.projectPath)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "projectPath must be a non-empty string",
    };
  }

  return {
    ok: true,
    value: { projectPath: value.projectPath as string | undefined },
  };
};

export const validateProjectPathQuery = (
  value: unknown,
): ValidationResult<string | undefined> => {
  if (value === undefined) return { ok: true, value: undefined };
  if (Array.isArray(value)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "path query must be a single string",
    };
  }
  if (!isNonEmptyString(value)) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "path query must be a non-empty string",
    };
  }
  return { ok: true, value };
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

  if (
    !["missing", "malformed", "schema-invalid", "valid"].includes(
      String(value.state),
    )
  ) {
    return { ok: false, code: "SCHEMA_INVALID", message: "state is invalid" };
  }

  if (value.state === "valid") {
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
      message: "report must be null when state is not valid",
    };
  }

  if (!isRecord(value.error)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "error must be an object when state is not valid",
    };
  }

  if (!isNonEmptyString(value.error.code)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "error.code must be a non-empty string",
    };
  }

  if (!isNonEmptyString(value.error.message)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "error.message must be a non-empty string",
    };
  }

  return {
    ok: true,
    value: value as unknown as LatestReportResponse,
  };
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

  const requiredStrings = ["scanId", "startedAt", "finishedAt", "reportPath"];
  for (const key of requiredStrings) {
    if (!isNonEmptyString(value[key])) {
      return {
        ok: false,
        code: "SCHEMA_INVALID",
        message: `${key} must be a non-empty string`,
      };
    }
  }

  if (!["passed", "failed", "warning"].includes(String(value.status))) {
    return { ok: false, code: "SCHEMA_INVALID", message: "status is invalid" };
  }

  if (!isRecord(value.project)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "project must be an object",
    };
  }

  if (typeof value.sourceFileCount !== "number") {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "sourceFileCount must be a number",
    };
  }

  if (!Array.isArray(value.issues)) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "issues must be an array",
    };
  }

  return { ok: true, value: value as unknown as ScanResponse };
};
