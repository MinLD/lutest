> **STALE / HISTORICAL DOC**
>
> This file is from the MVP-to-production refactor era. Do **not** use it as the current implementation roadmap.
> Current source of truth: `AI_HANDOFF.md`, `docs/ai-context/*`, `docs/plan/lutest-production-completion-roadmap.md`, `docs/plan/production-refactor-progress.md`, and `docs/plan/promt.md`.
>
> Keep this file only for historical context.

---

# LUTEST — Production Implementation Roadmap

Phiên bản: 1.0  
Ngày: 30/06/2026  
Nguồn chuẩn: `master-srs-production.md`  
Mục tiêu: biến SRS production thành danh sách việc có thể giao cho developer/AI code theo từng chặng, có thứ tự, có tiêu chí nghiệm thu, có test bắt buộc.

---

## 0. Nguyên tắc bắt buộc

Dự án không được tiếp tục theo hướng “MVP nhìn được dashboard là xong”. Production của Lutest phải có nền phân tích đáng tin cậy:

1. API phải có runtime validation.
2. Path phải có security policy.
3. Report phải có schema integrity.
4. Graph phải nâng từ file-level sang AST symbol-level.
5. Scan phải có lifecycle rõ.
6. UI phải đọc API thật và hiển thị lỗi thật.
7. CLI phải quản lý worker deterministic.
8. Mọi module production phải có fixture/unit/integration tests.

Không mở Playwright/AABB/cache/npm publish trước khi P0 pass.

---

## 1. Milestone Overview

| Milestone | Tên | Mục tiêu | Trạng thái mong muốn |
|---|---|---|---|
| P0 | Production Foundation | Validation, path policy, report integrity, AST graph contracts | Bắt buộc trước mọi feature mới |
| P1 | Hardening | Config, rule engine budget, UI error handling, CLI lifecycle, tests | Bắt buộc trước beta/publish |
| P2 | Runtime Scan | Playwright, DOM snapshot, screenshot, visual engine, issue mapping | Sau khi P0/P1 ổn |
| P3 | Optimization | Cache diff, incremental scan, stale report, impact analysis | Sau runtime scan |
| P4 | Release | npm pack/dry-run/publish, release docs | Sau production gate |

---

## 2. P0 — Production Foundation

### P0-01 — Chốt canonical API routes

**Mục tiêu**

Loại bỏ nhập nhằng giữa `/api/scan` và `/api/actions/scan`.

**Quyết định**

Canonical route:

```txt
POST /api/actions/scan
```

Legacy alias tạm thời nếu cần:

```txt
POST /api/scan
```

**Files dự kiến**

```txt
apps/worker-node/src/app.ts
apps/worker-node/src/modules/scan/scan.routes.ts
apps/ui/src/lib/api-client.ts
packages/contracts/src/index.ts
docs/plan/*
```

**Implementation steps**

1. Mount scan route tại `/api/actions/scan`.
2. Nếu giữ `/api/scan`, mark là legacy alias.
3. UI chỉ gọi canonical route.
4. Docs chỉ dùng canonical route, phần legacy ghi rõ deprecated.
5. Thêm integration test cho canonical route.

**Acceptance criteria**

- `POST /api/actions/scan` chạy được.
- UI không gọi `/api/scan` nữa.
- Nếu `/api/scan` còn tồn tại thì response header hoặc log có deprecation warning.
- Không có docs nào xem `/api/scan` là route chính.

---

### P0-02 — Runtime validators cho contracts

**Mục tiêu**

TypeScript chỉ bảo vệ compile-time, không bảo vệ HTTP runtime. Production API phải validate request/response.

**Files dự kiến**

```txt
packages/contracts/src/index.ts
packages/contracts/src/validators/api-error.validator.ts
packages/contracts/src/validators/status.validator.ts
packages/contracts/src/validators/project.validator.ts
packages/contracts/src/validators/graph.validator.ts
packages/contracts/src/validators/scan.validator.ts
packages/contracts/src/validators/report.validator.ts
packages/contracts/src/validators/common.ts
packages/contracts/src/validators/index.ts
```

**Validator tối thiểu**

```ts
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string; path?: string };
```

**Required validators**

```ts
validateStatusResponse(input: unknown): ValidationResult<StatusResponse>
validateProjectPathQuery(input: unknown): ValidationResult<ProjectPathQuery>
validateProjectSummary(input: unknown): ValidationResult<ProjectSummary>
validateGraphResponse(input: unknown): ValidationResult<GraphResponse>
validateScanRequest(input: unknown): ValidationResult<ScanRequest>
validateScanResponse(input: unknown): ValidationResult<ScanResponse>
validateLatestReportResponse(input: unknown): ValidationResult<LatestReportResponse>
validateApiErrorResponse(input: unknown): ValidationResult<ApiErrorResponse>
```

**Implementation rules**

1. Không dùng `any` để né schema.
2. Không cast `as unknown as Type`.
3. Reject object có shape nguy hiểm.
4. Với unknown fields:
   - request: reject nếu field không nằm trong schema.
   - response: có thể strip hoặc reject, nhưng production nên reject ở controller test.
5. Mỗi validator có unit test valid/invalid.

**Acceptance criteria**

- Controller gọi validator trước service.
- Response quan trọng được validate trước khi ghi report hoặc trả API.
- Invalid body trả `400 INVALID_REQUEST`.
- Schema invalid report trả `SCHEMA_INVALID`.
- `npm run typecheck` pass.
- Unit tests pass.

---

### P0-03 — Chuẩn hóa Error Model

**Mục tiêu**

Mọi API error trả JSON ổn định, không raw stacktrace, không HTML error.

**Files dự kiến**

```txt
packages/contracts/src/index.ts
apps/worker-node/src/shared/errors/app-error.ts
apps/worker-node/src/shared/middleware/error-handler.ts
apps/worker-node/src/shared/middleware/not-found.ts
```

**Error response chuẩn**

```ts
export type ApiErrorResponse = {
  error: {
    code:
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
    message: string;
    details?: unknown;
  };
};
```

**HTTP status mapping**

| Code | HTTP |
|---|---:|
| `INVALID_REQUEST` | 400 |
| `PATH_NOT_ALLOWED` | 403 |
| `NOT_FOUND` | 404 |
| `PROJECT_NOT_FOUND` | 404 |
| `SCHEMA_INVALID` | 422 |
| `REPORT_READ_ERROR` | 500 |
| `STORAGE_WRITE_ERROR` | 500 |
| `PLAYWRIGHT_ERROR` | 500 |
| `INTERNAL_ERROR` | 500 |

**Acceptance criteria**

- 404 trả `ApiErrorResponse`.
- Async errors đi qua `next(error)` hoặc async wrapper.
- Production mode không leak stacktrace.
- UI parse được `error.code` và `error.message`.

---

### P0-04 — Path Security Policy

**Mục tiêu**

Worker có quyền đọc filesystem local, nên phải chặn scan nhầm hoặc scan path ngoài phạm vi được cho phép.

**Files dự kiến**

```txt
apps/worker-node/src/shared/services/path.service.ts
apps/worker-node/src/shared/services/path-policy.service.ts
apps/worker-node/src/shared/services/path-policy.service.test.ts
apps/worker-node/src/modules/project/project.controller.ts
apps/worker-node/src/modules/graph/graph.controller.ts
apps/worker-node/src/modules/report/report.controller.ts
apps/worker-node/src/modules/scan/scan.controller.ts
```

**Policy production**

1. CLI truyền `allowedProjectRoot` khi spawn worker.
2. Dashboard không được scan path bất kỳ ngoài `allowedProjectRoot` nếu chưa có explicit allowlist.
3. `projectPath` từ query/body phải resolve về chính allowed root hoặc child path hợp lệ theo policy.
4. Root phải tồn tại và là directory.
5. Không scan `node_modules`, `.git`, `.next`, `dist`, `build`, `.lutest`.
6. Không follow symlink ra ngoài allowed root nếu chưa thiết kế rõ.

**Acceptance criteria**

- `../../` traversal bị chặn.
- Path không tồn tại trả lỗi rõ.
- File path thay vì directory bị chặn.
- Windows path có space được xử lý đúng.
- Unit test cho allowed/disallowed path pass.

---

### P0-05 — Report Read Result Type + Schema Integrity

**Mục tiêu**

Không được biến mọi lỗi đọc report thành `null`. Production phải phân biệt missing, malformed, schema-invalid, permission-denied.

**Files dự kiến**

```txt
apps/worker-node/src/shared/services/storage.service.ts
apps/worker-node/src/modules/report/report.repository.ts
apps/worker-node/src/modules/report/report.service.ts
apps/worker-node/src/modules/report/report.controller.ts
packages/contracts/src/validators/report.validator.ts
```

**Result type**

```ts
export type JsonReadResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "missing" }
  | { kind: "malformed"; error: string }
  | { kind: "schema-invalid"; error: string }
  | { kind: "permission-denied"; error: string }
  | { kind: "io-error"; error: string };
```

**Behavior**

| Result | API behavior |
|---|---|
| `ok` | `200 { report }` |
| `missing` | `200 { report: null }` |
| `malformed` | `500 REPORT_READ_ERROR` |
| `schema-invalid` | `422 SCHEMA_INVALID` |
| `permission-denied` | `500 REPORT_READ_ERROR` |
| `io-error` | `500 REPORT_READ_ERROR` |

**Acceptance criteria**

- Missing report không crash.
- Malformed JSON không bị nuốt thành null.
- Schema mismatch bị reject.
- Tests đủ 4 case: missing, malformed, schema-invalid, valid.

---

### P0-06 — AST Parser Foundation

**Mục tiêu**

Nâng graph từ file-level sang symbol-level.

**Files dự kiến**

```txt
apps/worker-node/src/modules/graph/ast/ast-parser.ts
apps/worker-node/src/modules/graph/ast/symbol-extractor.ts
apps/worker-node/src/modules/graph/ast/import-extractor.ts
apps/worker-node/src/modules/graph/ast/jsx-usage-extractor.ts
apps/worker-node/src/modules/graph/ast/call-extractor.ts
apps/worker-node/src/modules/graph/ast/api-call-extractor.ts
apps/worker-node/src/modules/graph/ast/types.ts
apps/worker-node/src/modules/graph/graph-linker.ts
```

**Internal model**

```ts
export type ParsedSourceFile = {
  filePath: string;
  language: "ts" | "tsx" | "js" | "jsx";
  imports: ImportSymbol[];
  exports: ExportSymbol[];
  declarations: SymbolDeclaration[];
  jsxUses: JsxUse[];
  calls: CallExpressionInfo[];
  apiCalls: ApiCallInfo[];
  diagnostics: ParseDiagnostic[];
};
```

**Acceptance criteria**

- Parse `.ts`, `.tsx`, `.js`, `.jsx`.
- Extract function declarations, arrow function exports, default export components.
- Extract JSX component usage.
- Extract imports including aliased imports.
- Extract fetch/axios/ky/ofetch calls.
- Không crash toàn graph vì một file parse lỗi.
- Có fixture tests.

---

### P0-07 — Symbol Graph Builder

**Mục tiêu**

Graph phải trả lời được:

```txt
Page nào render component nào?
Component/hook/service nào gọi API client nào?
API client nào gọi endpoint nào?
```

**Files dự kiến**

```txt
apps/worker-node/src/modules/graph/symbol-graph.builder.ts
apps/worker-node/src/modules/graph/import-resolver.ts
apps/worker-node/src/modules/graph/route-discovery.ts
apps/worker-node/src/modules/graph/api-trace.service.ts
packages/contracts/src/index.ts
packages/contracts/src/validators/graph.validator.ts
```

**Node kinds production**

```ts
type GraphNodeKind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint";
```

**Edge kinds production**

```ts
type GraphEdgeKind =
  | "import"
  | "render"
  | "call"
  | "http"
  | "route";
```

**Acceptance criteria**

- Component count dựa trên declarations, không chỉ file.
- API count dựa trên API methods/calls, không chỉ file.
- Render edges từ JSX usage.
- Call edges từ function calls có thể resolve.
- HTTP edges từ API client method tới endpoint.
- Edge có `confidence` và `reason`.
- Fixture `next-custom-api-client` pass.

---

### P0-08 — Contract/schema alignment

**Mục tiêu**

Không để worker trả field ngoài contracts hoặc UI đoán field không có.

**Files dự kiến**

```txt
packages/contracts/src/index.ts
packages/contracts/src/validators/*
apps/worker-node/src/modules/*/*.mapper.ts
apps/ui/src/lib/api-client.ts
```

**Acceptance criteria**

- Khi đổi contract, build worker/UI/contracts đều pass.
- `GraphResponse` production có validator.
- `ScanResponse` production có validator.
- Không còn `as unknown as Type` trong API mapper.
- Không thêm field response cục bộ ở worker mà không sửa contracts.

---

## 3. P1 — Production Hardening

### P1-01 — Rule Engine Budget + Config

**Mục tiêu**

Rule engine không được đọc file vô hạn, không hardcode threshold.

**Tasks**

1. Thêm bounded file reader.
2. Config hóa max file size, max files, large file line threshold.
3. Skip binary/minified/generated files.
4. Một file lỗi không làm fail toàn scan.
5. Rule issue type cụ thể, hạn chế `unknown`.

**Acceptance criteria**

- Project lớn không làm worker treo.
- Threshold lấy từ config.
- Tests cho file quá lớn, binary, permission denied.

---

### P1-02 — Config System Production

**Mục tiêu**

Không module nào tự đọc env nếu config service đã cung cấp.

**Merge order**

```txt
1. defaults
2. config file
3. env vars
4. CLI flags
```

**Acceptance criteria**

- Config final được validate.
- CORS origin, worker timeout, scan budget, route samples lấy từ config.
- Có docs `lutest.yaml`.
- Tests precedence pass.

---

### P1-03 — UI API Client Hardening

**Mục tiêu**

UI không crash và hiển thị lỗi thật.

**Tasks**

1. Typed API client theo contracts.
2. Parse `ApiErrorResponse`.
3. Loading/error/empty/stale/scanning states.
4. Không hardcode worker URL ngoài config fallback có docs.
5. Không hardcode project path production.
6. Tách `dashboard-shell.tsx` nếu quá lớn.

**Acceptance criteria**

- Missing report render empty state.
- Malformed report render error state.
- Scan running disable button.
- Build pass.

---

### P1-04 — CLI Lifecycle Hardening

**Mục tiêu**

`lutest scan <projectPath>` chạy end-to-end đáng tin cậy.

**Tasks**

1. Validate args.
2. Select available port.
3. Spawn worker.
4. Wait health check with timeout.
5. Call scan API.
6. Print summary.
7. Shutdown worker.
8. Exit code chuẩn:
   - `0`: passed
   - `1`: failed/internal error
   - `2`: invalid input

**Acceptance criteria**

- Port conflict test pass.
- Worker startup timeout test pass.
- Ctrl+C cleanup pass.
- npm pack local install pass.

---

### P1-05 — Test Coverage Baseline

**Minimum tests**

```txt
contracts validators
path policy
storage read/write result
project discovery fixtures
graph AST fixtures
scan status mapper
report missing/malformed/schema invalid
worker 404/error middleware
CLI lifecycle smoke
```

**Acceptance criteria**

- CI/local `npm run typecheck` pass.
- Unit/integration tests pass.
- Fixture tests có snapshot hoặc explicit asserts.

---

## 4. P2 — Runtime Scan / Playwright / Visual Engine

### P2-01 — Scan Job Manager

**Mục tiêu**

Tránh scan dài trong một blocking HTTP request.

**Recommended APIs**

```txt
POST /api/actions/scan
GET  /api/scans/:scanId
POST /api/scans/:scanId/cancel
GET  /api/report/latest
```

**Acceptance criteria**

- UI thấy progress.
- Double click scan không tạo race vô kiểm soát.
- Cancel được nếu scan đang chạy.
- Latest report chỉ update khi scan completed.

---

### P2-02 — Playwright Browser Runner

**Tasks**

1. Launch Chromium.
2. Load auth storage state nếu có.
3. Navigate route list.
4. Collect console errors.
5. Collect page errors.
6. Capture screenshots.
7. Collect DOM bounding boxes.
8. Close browser trong `finally`.

**Acceptance criteria**

- Target URL chết trả lỗi rõ.
- Browser missing trả lỗi actionable.
- Screenshot path safe Windows.
- Không log token/session.

---

### P2-03 — Visual Engine

**Checks**

1. Overflow.
2. AABB overlap.
3. Contrast.
4. Text clipping nếu scope cho phép.

**Acceptance criteria**

- Hidden elements bị bỏ qua.
- Parent-child overlap bình thường bị bỏ qua.
- Modal/dropdown/tooltip có filter.
- Dedup issue.
- Max visual issues/route.
- Issue map được về route + graph nodes.

---

## 5. P3 — Cache Diff / Incremental Scan

**Mục tiêu**

Không full scan vô ích nếu chỉ vài file thay đổi.

**Tasks**

1. Hash source files.
2. Lưu `.lutest/hash.json`.
3. Compare previous/current hash.
4. Map changed files sang graph nodes.
5. Trace affected pages/routes.
6. Suggest routes cần retest.
7. Fallback full scan nếu graph/hash thiếu.

**Acceptance criteria**

- Thay component shared → affected routes đúng.
- Thay file utility không ảnh hưởng route → không scan dư nếu chắc chắn.
- Hash missing → full scan.
- Graph stale → full scan.

---

## 6. P4 — Release / Publish Gate

**Release gate**

1. `npm run typecheck` pass.
2. Build pass.
3. Tests pass.
4. CLI local scan fixture pass.
5. `npm pack` pass.
6. Install global tarball pass.
7. `npm publish --dry-run --access public` pass.
8. Tarball không chứa `node_modules`, fixtures thừa, `.lutest`, dev artifacts.
9. README usage tối thiểu.
10. Release notes.

---

## 7. Definition of Done tổng

Một module chỉ được gọi là `Production Done` khi:

1. Có contract rõ.
2. Có runtime validation nếu vào/ra API hoặc storage.
3. Có error handling typed.
4. Có test valid/invalid.
5. Không mock/placeholder trong code production.
6. Không hardcode path/env nếu đã có config/path service.
7. Không dùng heuristic-only cho graph production.
8. Docs cập nhật.
9. Typecheck/build pass.
