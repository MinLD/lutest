> **STALE / HISTORICAL DOC**
>
> This file is from the MVP-to-production refactor era. Do **not** use it as the current implementation roadmap.
> Current source of truth: `AI_HANDOFF.md`, `docs/ai-context/*`, `docs/plan/lutest-production-completion-roadmap.md`, `docs/plan/production-refactor-progress.md`, and `docs/plan/promt.md`.
>
> Keep this file only for historical context.

---

# LUTEST — Production API Contract Specification

Phiên bản: 1.0  
Ngày: 30/06/2026  
Nguồn chuẩn: `master-srs-production.md`  
Mục tiêu: định nghĩa API contracts production cho Worker Express và Dashboard/CLI client.

---

## 0. API Principles

1. API là local HTTP JSON API.
2. Không endpoint nào trả HTML.
3. Mọi error trả `ApiErrorResponse`.
4. Request phải runtime-validate trước service.
5. Response quan trọng phải align với `packages/contracts`.
6. Không thêm field public nếu chưa sửa contracts + validators + UI.
7. Canonical scan route là `POST /api/actions/scan`.

---

## 1. Common Types

### 1.1 ApiErrorResponse

```ts
export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "SCHEMA_INVALID"
  | "PATH_NOT_ALLOWED"
  | "PROJECT_NOT_FOUND"
  | "REPORT_READ_ERROR"
  | "STORAGE_WRITE_ERROR"
  | "PLAYWRIGHT_ERROR"
  | "WORKER_NOT_READY";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};
```

### 1.2 HTTP Status Mapping

| Code | HTTP status | Meaning |
|---|---:|---|
| `INVALID_REQUEST` | 400 | Request body/query invalid |
| `PATH_NOT_ALLOWED` | 403 | Project path outside allowed policy |
| `NOT_FOUND` | 404 | Route/resource missing |
| `PROJECT_NOT_FOUND` | 404 | Project root missing/not directory |
| `SCHEMA_INVALID` | 422 | Stored/API data failed schema validation |
| `REPORT_READ_ERROR` | 500 | Report cannot be read safely |
| `STORAGE_WRITE_ERROR` | 500 | Cannot persist graph/report/screenshot |
| `PLAYWRIGHT_ERROR` | 500 | Browser/runtime scan failed unexpectedly |
| `WORKER_NOT_READY` | 503 | Worker not ready |
| `INTERNAL_ERROR` | 500 | Unhandled internal error |

### 1.3 ValidationResult

```ts
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ApiErrorCode; message: string; path?: string };
```

---

## 2. GET /api/status

### Purpose

Health check cho CLI Host và Dashboard.

### Request

```http
GET /api/status
```

Không có body.

### 200 Response

```ts
export type StatusResponse = {
  status: "ok" | "error";
  uptime: number;
  service: "lutest-worker";
  runtime: "node";
  env: string;
};
```

Example:

```json
{
  "status": "ok",
  "uptime": 12.4,
  "service": "lutest-worker",
  "runtime": "node",
  "env": "development"
}
```

### Error cases

| Case | Response |
|---|---|
| Worker not ready | `503 WORKER_NOT_READY` |
| Unexpected exception | `500 INTERNAL_ERROR` |

### Validation

- `uptime` must be non-negative number.
- `service` must equal `lutest-worker`.
- `runtime` must equal `node`.

---

## 3. GET /api/project

### Purpose

Detect target project metadata and framework.

### Request

```http
GET /api/project?path=<projectPath>
```

### Query schema

```ts
export type ProjectPathQuery = {
  path?: string;
};
```

Rules:

1. `path` optional.
2. If provided, must be non-empty string.
3. Must pass path policy.
4. Must resolve to allowed project root or allowed child path.

### 200 Response

```ts
export type DetectedFramework =
  | "next"
  | "vite-react"
  | "react"
  | "vue"
  | "laravel"
  | "php"
  | "unknown"
  | null;

export type ProjectSummary = {
  name: string;
  rootDir: string;
  lutestDir: string;
  packageJsonExists: boolean;
  detectedFramework: DetectedFramework;
  sourceFileCount?: number;
};
```

Example:

```json
{
  "name": "shop-next",
  "rootDir": "/Users/me/shop-next",
  "lutestDir": "/Users/me/shop-next/.lutest",
  "packageJsonExists": true,
  "detectedFramework": "next",
  "sourceFileCount": 42
}
```

### Error cases

| Case | HTTP | Code |
|---|---:|---|
| Query path is array/object | 400 | `INVALID_REQUEST` |
| Path outside allowed root | 403 | `PATH_NOT_ALLOWED` |
| Path does not exist | 404 | `PROJECT_NOT_FOUND` |
| Path is not directory | 400 | `INVALID_REQUEST` |
| Permission denied | 500 | `INTERNAL_ERROR` |

### Framework detection rules

1. `next` dependency => `next`.
2. `vite` + `react` dependencies => `vite-react`.
3. `react` dependency => `react`.
4. `vue` dependency => `vue`.
5. `artisan` or `composer.json` => `laravel`.
6. `index.php` => `php`.
7. No match => `unknown`.

---

## 4. GET /api/graph

### Purpose

Build/read project graph. Production graph must be symbol-level where possible.

### Request

```http
GET /api/graph?path=<projectPath>&mode=symbol
```

### Query schema

```ts
export type GraphQuery = {
  path?: string;
  mode?: "file" | "symbol";
};
```

Default:

```txt
mode = "symbol"
```

### Production Graph Types

```ts
export type GraphNodeKind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint";

export type GraphEdgeKind =
  | "import"
  | "render"
  | "call"
  | "http"
  | "route";

export type GraphConfidence = "high" | "medium" | "low";

export type SourceLocation = {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
};

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  name: string;
  filePath?: string;
  loc?: SourceLocation;
  route?: string;
  http?: {
    method?: string;
    path?: string;
  };
  metadata?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  confidence: GraphConfidence;
  reason: string;
};

export type GraphSummary = {
  fileCount: number;
  pageCount: number;
  componentCount: number;
  hookCount: number;
  apiRouteCount: number;
  apiClientMethodCount: number;
  externalEndpointCount: number;
  edgeCount: number;
};

export type GraphResponse = {
  mode: "file" | "symbol";
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: GraphSummary;
  diagnostics: GraphDiagnostic[];
};

export type GraphDiagnostic = {
  code:
    | "PARSE_ERROR"
    | "IMPORT_UNRESOLVED"
    | "DYNAMIC_ENDPOINT"
    | "ALIAS_UNRESOLVED"
    | "UNSUPPORTED_FILE";
  severity: "info" | "warning" | "error";
  message: string;
  filePath?: string;
};
```

### 200 Example

```json
{
  "mode": "symbol",
  "nodes": [
    {
      "id": "app/products/page.tsx#ProductsPage",
      "kind": "page",
      "name": "ProductsPage",
      "filePath": "app/products/page.tsx",
      "route": "/products",
      "loc": { "startLine": 4 }
    },
    {
      "id": "components/ProductGrid.tsx#ProductGrid",
      "kind": "component",
      "name": "ProductGrid",
      "filePath": "components/ProductGrid.tsx",
      "loc": { "startLine": 2 }
    },
    {
      "id": "lib/api-client.ts#getProducts",
      "kind": "api-client-method",
      "name": "getProducts",
      "filePath": "lib/api-client.ts",
      "http": { "method": "GET", "path": "/api/products" }
    }
  ],
  "edges": [
    {
      "id": "render:app/products/page.tsx#ProductsPage->components/ProductGrid.tsx#ProductGrid",
      "kind": "render",
      "source": "app/products/page.tsx#ProductsPage",
      "target": "components/ProductGrid.tsx#ProductGrid",
      "confidence": "high",
      "reason": "JSX <ProductGrid /> resolved from named import"
    }
  ],
  "summary": {
    "fileCount": 11,
    "pageCount": 4,
    "componentCount": 8,
    "hookCount": 2,
    "apiRouteCount": 1,
    "apiClientMethodCount": 3,
    "externalEndpointCount": 2,
    "edgeCount": 18
  },
  "diagnostics": []
}
```

### Error cases

| Case | HTTP | Code |
|---|---:|---|
| Invalid query | 400 | `INVALID_REQUEST` |
| Path outside policy | 403 | `PATH_NOT_ALLOWED` |
| Project missing | 404 | `PROJECT_NOT_FOUND` |
| Graph response schema invalid | 422 | `SCHEMA_INVALID` |
| Graph persist failed | 500 | `STORAGE_WRITE_ERROR` |

---

## 5. POST /api/actions/scan

### Purpose

Start project scan. Production may use job mode if Playwright/visual scan is long-running.

### Request

```http
POST /api/actions/scan
Content-Type: application/json
```

### Request schema

```ts
export type ScanRequest = {
  projectPath?: string;
  mode?: "static" | "browser" | "full";
  force?: boolean;
};
```

Rules:

1. Body must be object.
2. Unknown fields rejected.
3. `projectPath` must pass path policy.
4. `mode` default: `full` if target URL configured, else `static`.
5. `force` default: `false`.

### MVP-compatible sync response

```ts
export type ScanIssueType =
  | "console"
  | "syntax"
  | "overflow"
  | "todo"
  | "large-file"
  | "maintainability"
  | "accessibility"
  | "visual"
  | "api"
  | "unknown";

export type ScanIssueSeverity = "info" | "warning" | "error";

export type ScanIssue = {
  id: string;
  type: ScanIssueType;
  severity: ScanIssueSeverity;
  message: string;
  filePath?: string;
  route?: string;
  nodeIds?: string[];
  screenshotPath?: string;
};

export type ScanResponse = {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed" | "warning";
  project: ProjectSummary;
  sourceFileCount: number;
  issues: ScanIssue[];
  reportPath: string;
  graphPath?: string;
  scannedRoutes?: string[];
};
```

### Production async response option

```ts
export type ScanStartResponse = {
  scanId: string;
  status: "queued" | "running";
  statusUrl: string;
};
```

Recommended behavior:

- Static-only scan may return `ScanResponse` synchronously.
- Full browser scan should return `202 ScanStartResponse` and expose job status.

### Status rules

```ts
if (issues.some(issue => issue.severity === "error")) status = "failed";
else if (issues.length > 0) status = "warning";
else status = "passed";
```

### Error cases

| Case | HTTP | Code |
|---|---:|---|
| Body missing/not object | 400 | `INVALID_REQUEST` |
| Unknown request fields | 400 | `INVALID_REQUEST` |
| Path outside policy | 403 | `PATH_NOT_ALLOWED` |
| Storage write failed | 500 | `STORAGE_WRITE_ERROR` |
| Browser missing | 500 | `PLAYWRIGHT_ERROR` |
| Target URL dead | 200/500 depending policy | issue severity `error` or `PLAYWRIGHT_ERROR` |

---

## 6. GET /api/scans/:scanId

### Purpose

Read scan job status. Required when scan runs async.

### Request

```http
GET /api/scans/:scanId
```

### Response

```ts
export type ScanJobStatus =
  | "queued"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "cancelled";

export type ScanJobResponse = {
  scanId: string;
  status: ScanJobStatus;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress: {
    step:
      | "resolving-project"
      | "discovering-project"
      | "building-graph"
      | "running-static-rules"
      | "launching-browser"
      | "scanning-routes"
      | "running-visual-checks"
      | "writing-report"
      | "done";
    scannedRoutes: number;
    totalRoutes: number;
  };
  result?: ScanResponse;
  error?: ApiErrorResponse;
};
```

### Error cases

| Case | HTTP | Code |
|---|---:|---|
| scanId invalid format | 400 | `INVALID_REQUEST` |
| scanId not found | 404 | `NOT_FOUND` |

---

## 7. POST /api/scans/:scanId/cancel

### Purpose

Cancel running scan job.

### Request

```http
POST /api/scans/:scanId/cancel
```

### Response

```ts
export type CancelScanResponse = {
  scanId: string;
  status: "cancelled";
};
```

### Behavior

1. If scan queued: remove from queue.
2. If browser running: close browser/context/page safely.
3. Do not write latest report for cancelled scan.
4. Preserve partial diagnostics internally if useful.

---

## 8. GET /api/report/latest

### Purpose

Read latest completed report.

### Request

```http
GET /api/report/latest?path=<projectPath>
```

### Response

```ts
export type LatestReportResponse = {
  report: ScanResponse | null;
};
```

### Behavior

| Storage state | API behavior |
|---|---|
| Missing report | `200 { "report": null }` |
| Valid report | `200 { "report": ... }` |
| Malformed JSON | `500 REPORT_READ_ERROR` |
| Schema invalid | `422 SCHEMA_INVALID` |
| Permission denied | `500 REPORT_READ_ERROR` |

---

## 9. GET /api/auth/status

### Purpose

Check local auth storage-state existence/status.

### Response

```ts
export type AuthStatusResponse = {
  enabled: boolean;
  storageStateExists: boolean;
  valid: boolean;
  updatedAt?: string;
};
```

Rules:

- Never return token/session contents.
- Never log cookies/localStorage values.

---

## 10. POST /api/actions/auth/start

### Purpose

Start manual Playwright auth flow.

### Response

```ts
export type AuthStartResponse = {
  status: "started";
  message: string;
};
```

Behavior:

1. Open browser.
2. User logs in manually.
3. Save storage state to `.lutest/auth/storage-state.json`.
4. Do not store password.
5. Do not log token/session.

---

## 11. POST /api/actions/auth/clear

### Purpose

Clear local Playwright auth storage state.

### Response

```ts
export type AuthClearResponse = {
  status: "cleared";
};
```

---

## 12. GET /api/cache/diff

### Purpose

Return source file changes and affected graph nodes/routes.

### Response

```ts
export type CacheDiffResponse = {
  available: boolean;
  reason?: "hash-missing" | "graph-missing" | "schema-invalid";
  changedFiles: string[];
  affectedNodeIds: string[];
  suggestedRoutes: string[];
  fallbackFullScan: boolean;
};
```

Rules:

- Missing hash => fallback full scan.
- Missing graph => fallback full scan.
- Cache error must not block scan.

---

## 13. API Client Requirements for UI

UI fetch client must:

1. Use typed contracts.
2. Parse `ApiErrorResponse`.
3. Treat non-JSON response as API error.
4. Expose loading/error/empty states.
5. Not assume `report` exists.
6. Not assume `nodes` or `issues` exists on failed response.

---

## 14. Contract Change Process

When changing any public API field:

1. Update `packages/contracts` type.
2. Update runtime validator.
3. Update worker mapper/service/repository.
4. Update UI fetch/render.
5. Update docs.
6. Add/modify tests.
7. Run typecheck/build/tests.

No exception.
