# MASTER SRS PRODUCTION: LUTEST

Cập nhật: 30/06/2026  
Trạng thái: Production-grade SRS  
Phạm vi: Local-first production product, chưa phải cloud/SaaS

---

## 0. Nhận định về SRS hiện tại

SRS hiện tại mô tả đúng hướng sản phẩm nhưng chủ yếu là **MVP/local core 8 tuần đầu**: CLI chạy được, Worker Express có API, project detection cơ bản, graph sơ bộ từ source files, scan/report local, dashboard đọc API thật.

Bản production này nâng chuẩn từ:

```txt
file inventory + graph sơ bộ + scan chạy được
```

thành:

```txt
static/runtime analysis engine có graph ngữ nghĩa, validation runtime, path policy, report integrity, deterministic CLI lifecycle và fixture tests đầy đủ
```

Một module không được coi là production nếu còn mock, placeholder, heuristic-only, hardcode không có policy, hoặc chưa có runtime validation/test.

---

## 1. Product Vision

Lutest là công cụ kiểm thử local-first cho dự án web, giúp developer:

1. Hiểu kiến trúc source code.
2. Biết page/route nào render component nào.
3. Biết component/hook/service nào gọi API client nào.
4. Biết API client nào gọi endpoint nào.
5. Chạy static/runtime/UI scan.
6. Map lỗi runtime/UI ngược về source file/symbol liên quan.
7. Biết report có stale, malformed, schema-invalid hay không.
8. Biết scan coverage theo route/symbol.
9. Biết file thay đổi sẽ ảnh hưởng route/component/API nào để retest.

Production value của Lutest không phải là hiển thị `pageCount`, `componentCount`, `apiCount` cho đẹp. Những số đó chỉ có giá trị nếu phục vụ graph semantics, route discovery, coverage, risk ranking, cache diff và issue-to-source mapping.

---

## 2. Scope

### 2.1 In scope

- CLI commands: `lutest`, `lutest scan <projectPath>`, `lutest --help`, `lutest version`.
- Deterministic CLI host lifecycle: parse config, chọn port, spawn worker, health check, trigger scan, shutdown, exit code.
- Worker Express API chạy local.
- Runtime validators cho API request/response.
- Path security policy rõ ràng.
- Project discovery production-grade.
- Framework detection có fixture tests.
- AST-based graph extraction cho `.ts`, `.tsx`, `.js`, `.jsx`.
- Symbol-level graph: file, page, component, hook, API route, API client method, external endpoint.
- Graph edges: import, render, call, http, route.
- Graph persistence vào `.lutest/graph/latest-graph.json`.
- Static rule engine có file budget, skip policy, configurable threshold.
- Scan job manager cho scan dài.
- Playwright browser scan sau khi P0/P1 pass.
- Screenshot capture.
- DOM bounding boxes.
- Visual checks: overflow, AABB overlap, contrast, clipping nếu có.
- Report schema validation.
- Atomic report write.
- Latest report read result phân biệt: missing, malformed, schema-invalid, stale, permission-denied, ok.
- Dashboard đọc API thật, không mock ở flow chính.
- Auth manual flow local nếu scan route protected.
- Cache diff local nếu graph/report stable.
- Windows/Linux support.
- NPM publish readiness sau khi CLI lifecycle pass.

### 2.2 Out of scope

- Cloud dashboard.
- Account/team workspace.
- Billing.
- Remote sync.
- Upload source/report lên server ngoài.
- AI tự sửa code.
- Pixel-perfect visual diff.
- Full multi-browser/mobile matrix.
- Full WCAG audit.
- Redis/Postgres/distributed queue.

---

## 3. Actors / Systems

| Actor/System | Vai trò |
|---|---|
| Developer | Chạy CLI, mở dashboard, xem report, sửa lỗi. |
| CLI Host | Parse command/config, resolve path, spawn worker, health check, gọi scan, shutdown. |
| Worker Process | Express API, điều phối discovery, graph, scan, report, storage. |
| Dashboard UI | Gọi API thật, render graph/report/issues/screenshots/coverage. |
| Contracts Package | TypeScript contracts + runtime validators. |
| Config Service | Merge defaults, config file, env vars, CLI flags; validate final config. |
| Path Policy Service | Chặn path không hợp lệ, path traversal, arbitrary filesystem scan. |
| Path Service | Resolve `.lutest` paths tập trung. |
| Storage Service | JSON read/write, bounded file read, atomic write. |
| Project Discovery | Detect framework, list source files theo policy. |
| AST Parser | Parse source để tạo intermediate representation. |
| Graph Builder | Build symbol-level nodes/edges. |
| Import Resolver | Resolve relative/index/extensions/alias nếu hỗ trợ. |
| API Trace Engine | Trace hook/service/client/fetch/axios/ofetch/ky/custom wrapper. |
| Rule Engine | Static checks trên source + graph. |
| Scan Job Manager | Quản lý scan running/progress/cancel/concurrency. |
| Playwright Runner | Browser automation, screenshot, console/page errors, DOM boxes. |
| Visual Engine | Overflow, AABB, contrast, clipping. |
| Report Repository | Validate, write, read latest/history reports. |
| Local Filesystem | `.lutest/` nằm trong target project root. |
| Target Web App | Web app local đang được scan qua target URL. |

---

## 4. Architecture

```txt
User Terminal
  -> CLI Host
    -> Config Service
    -> Path Policy Service
    -> Worker Process Manager
      -> Worker Express API
        -> Request Validators
        -> Project Discovery
        -> AST Parser
        -> Graph Builder
        -> Rule Engine
        -> Scan Job Manager
          -> Playwright Runner
          -> Visual Engine
        -> Report Repository
        -> Storage Service
          -> TargetProject/.lutest/

Dashboard UI
  -> Worker API
    -> status/project/graph/report/scan/cache/auth
```

Production principle:

```txt
Contracts-first + runtime validation + path policy + schema integrity + fixture tests
```

---

## 5. Runtime Storage Layout

`.lutest/` luôn nằm trong root của target project.

```txt
<target-project>/.lutest/
  latest-report.json
  graph/
    latest-graph.json
    snapshots/
      <scanId>.graph.json
  screenshots/
    <scanId>/
      <routeSlug>__<viewport>.png
  reports/
    <scanId>.json
  hash.json
  auth/
    storage-state.json
  jobs/
    <scanId>.job.json
  logs/
    <scanId>.log.jsonl
```

Rules:

- Không lưu runtime data vào repo Lutest trừ khi Lutest chính là target project.
- Không hardcode `.lutest` path rải rác.
- Mọi path đi qua `pathService.resolveProjectPaths`.
- Mọi path ở trust boundary phải qua `pathPolicyService.assertProjectRoot`.
- Screenshot filename phải safe cho Windows.
- Không log cookies/token/localStorage/sessionStorage content.

---

## 6. Canonical API Routes

```txt
GET  /api/status
GET  /api/project
GET  /api/graph
GET  /api/report/latest
GET  /api/reports/:scanId
POST /api/actions/scan
GET  /api/scans/:scanId
POST /api/scans/:scanId/cancel
GET  /api/cache/diff
POST /api/actions/auth/start
POST /api/actions/auth/clear
GET  /api/auth/status
```

Route rule:

- Canonical scan route là `POST /api/actions/scan`.
- Nếu code hiện còn `POST /api/scan`, chỉ được giữ như legacy alias có deprecation note.
- UI, docs, contracts, tests phải dùng cùng canonical route.

---

## 7. Error Model

Mọi API error trả JSON chuẩn.

```ts
type ApiErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "SCHEMA_INVALID"
  | "PATH_NOT_ALLOWED"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_NOT_DIRECTORY"
  | "CONFIG_INVALID"
  | "WORKER_NOT_READY"
  | "SCAN_ALREADY_RUNNING"
  | "SCAN_CANCELLED"
  | "PLAYWRIGHT_ERROR"
  | "TARGET_UNREACHABLE"
  | "REPORT_MISSING"
  | "REPORT_MALFORMED"
  | "REPORT_SCHEMA_INVALID"
  | "REPORT_STALE"
  | "STORAGE_PERMISSION_DENIED"
  | "STORAGE_WRITE_FAILED";

type ApiErrorResponse = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};
```

Rules:

- Không trả HTML error.
- Không leak stack trace ngoài development.
- Không swallow error thành `null` nếu lỗi không phải missing hợp lệ.
- Controller validate request trước service.
- Service không trust raw HTTP input.

---

## 8. Contracts & Runtime Validation

Production contracts không chỉ là TypeScript types. Mỗi request/response public phải có runtime validator.

Required validators:

```txt
validateStatusResponse
validateProjectPathQuery
validateProjectSummary
validateGraphResponse
validateScanRequest
validateScanJobResponse
validateScanResponse
validateLatestReportResponse
validateApiErrorResponse
validateAuthStatusResponse
validateCacheDiffResponse
```

Validator behavior:

- Reject unknown dangerous object shapes ở request boundary.
- Validate string/non-empty/path-like values.
- Validate enum values.
- Validate arrays and nested objects.
- Validate date fields là ISO string.
- Validate report trước khi write và trước khi return.
- Unit tests cho valid/invalid payload.

---

## 9. Config System

Production merge order:

```txt
1. default config
2. lutest.yaml / lutest.json
3. .env / environment variables
4. CLI flags
```

Config schema:

```ts
type LutestConfig = {
  projectPath: string;
  targetUrl?: string;
  worker: {
    host: "127.0.0.1" | "localhost";
    port?: number;
    startupTimeoutMs: number;
    requestBodyLimit: string;
    allowedOrigins: string[];
  };
  scan: {
    mode: "static" | "browser" | "full";
    maxFiles: number;
    maxFileSizeBytes: number;
    maxRoutes: number;
    routeTimeoutMs: number;
    scanTimeoutMs: number;
    concurrency: number;
  };
  graph: {
    mode: "file" | "symbol";
    resolveAliases: boolean;
    traceCustomApiClient: boolean;
  };
  visual: {
    enabled: boolean;
    viewports: Array<{ width: number; height: number; name: string }>;
    overlapMinAreaPx: number;
    maxIssuesPerRoute: number;
  };
  report: {
    detectStale: boolean;
    atomicWrite: boolean;
  };
};
```

Không module nào tự đọc env/path hardcode nếu config service đã cung cấp value.

---

## 10. CLI Host Requirements

Commands:

```bash
lutest
lutest scan <projectPath>
lutest scan <projectPath> --target-url http://localhost:3000
lutest --help
lutest version
```

`lutest scan <projectPath>` flow:

1. Validate args.
2. Load config.
3. Resolve and assert allowed project root.
4. Pick available worker port.
5. Spawn worker.
6. Wait `GET /api/status` until ready or timeout.
7. Call `POST /api/actions/scan`.
8. Poll `GET /api/scans/:scanId` if scan is async.
9. Print summary.
10. Shutdown worker.
11. Return exit code.

Exit codes:

```txt
0 = scan passed
1 = scan failed or internal error
2 = invalid CLI input/config/path
3 = worker startup failure
4 = target unreachable/browser scan failure
```

Lifecycle requirements:

- Port conflict handled deterministically.
- Worker startup timeout configurable.
- Ctrl+C cleanup worker and browser.
- No orphan process after shutdown.
- npm pack behavior tested.

---

## 11. Worker App & Middleware Requirements

Required middleware:

- JSON body parser with configured limit.
- CORS from config, not hardcoded.
- Request ID middleware.
- Request logger, redacting secrets.
- Not found handler.
- Error handler.
- Validation middleware per route.

DoD:

- Unit/integration tests for 404/error/preflight.
- All route handlers return JSON.
- No raw stack trace outside development.
- Request validation runs before service.

---

## 12. Path Security Policy

Production rule:

```txt
Worker may scan only the project root selected by CLI/config or an explicitly allowed child path if policy permits it.
```

For every `projectPath` from query/body/config:

1. Must be string.
2. Must be non-empty.
3. Resolve with `node:path.resolve`.
4. Normalize real path if possible.
5. Must exist.
6. Must be directory.
7. Must not be inside ignored/generated dirs.
8. Must match allowed root policy.
9. If rejected, return `PATH_NOT_ALLOWED`, `PROJECT_NOT_FOUND`, or `PROJECT_NOT_DIRECTORY`.

Dashboard must not become arbitrary filesystem scanner. CLI selects target project root; dashboard can request that root only unless explicitly enabled by config.

---

## 13. Project Discovery Production Requirements

Output:

```ts
type DetectedFramework =
  | "next"
  | "vite-react"
  | "react"
  | "vue"
  | "laravel"
  | "php"
  | "unknown";

type ProjectSummary = {
  name: string;
  rootDir: string;
  lutestDir: string;
  packageJsonExists: boolean;
  detectedFramework: DetectedFramework;
  sourceFileCount: number;
  ignoredFileCount: number;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
};
```

Production removes `null` from `DetectedFramework`; unknown is represented by `"unknown"`.

Detection rules:

1. dependency `next` -> `next`.
2. dependencies `vite` + `react` -> `vite-react`.
3. dependency `react` -> `react`.
4. dependency `vue` -> `vue`.
5. `artisan` or Laravel indicators in `composer.json` -> `laravel`.
6. `index.php` -> `php`.
7. Else `unknown`.

Include source extensions:

```txt
.ts
.tsx
.js
.jsx
.mjs
.cjs
.php if PHP/Laravel support enabled
```

Ignore:

```txt
node_modules
.git
dist
build
.next
.nuxt
.vite
coverage
.lutest
vendor if PHP dependency dir
public static assets unless explicitly configured
```

Budget:

- max file count.
- max file size.
- skip binary/minified/generated files.
- discovery should not crash scan because one file is unreadable.

---

## 14. Graph Production Requirements

Production graph must be **symbol-level**, not only file-level.

Bad production metric:

```txt
components/ProductCard.tsx -> componentCount +1
```

Correct production metric:

```txt
components/ProductCard.tsx
  ProductCard -> component
  ProductImage -> component
  ProductPrice -> component
```

### 14.1 Graph modes

```ts
type GraphMode = "file" | "symbol";
```

- `file`: compatibility/debug mode.
- `symbol`: production default.

Dashboard must display current graph mode to avoid misleading metrics.

### 14.2 Node kinds

```ts
type GraphNodeKind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint"
  | "unknown";
```

### 14.3 Edge kinds

```ts
type GraphEdgeKind =
  | "import"
  | "render"
  | "call"
  | "http"
  | "route";
```

### 14.4 Node schema

```ts
type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  name: string;
  filePath?: string;
  route?: string;
  loc?: {
    startLine: number;
    endLine: number;
  };
  http?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    path?: string;
  };
  confidence: "high" | "medium" | "low";
  reason: string;
};
```

### 14.5 Edge schema

```ts
type GraphEdge = {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};
```

### 14.6 Graph summary

```ts
type GraphSummary = {
  fileCount: number;
  pageCount: number;
  componentCount: number;
  hookCount: number;
  apiRouteCount: number;
  apiClientMethodCount: number;
  externalEndpointCount: number;
  edgeCount: number;
  unresolvedImportCount: number;
  lowConfidenceEdgeCount: number;
};
```

### 14.7 Required traces

Production graph must trace at least:

```txt
page -> component
component -> component
page/component -> hook
hook -> service/api-client
api-client -> fetch/axios/ofetch/ky endpoint
Next API route file -> route endpoint/method
```

### 14.8 AST parser requirements

Must parse:

- Function declarations.
- Arrow function declarations.
- Default exports.
- Named exports.
- React component declarations.
- Hooks by naming convention and usage.
- JSX element usage.
- Import declarations.
- Dynamic imports with low-confidence markers.
- Function calls.
- `fetch`, `ofetch`, `axios`, `ky` calls.
- Basic custom client wrapper trace.

### 14.9 Confidence rules

Use `confidence` instead of pretending all graph edges are certain.

- Static import exact file -> high.
- JSX component resolved by named import -> high.
- Custom client wrapper traced one hop -> medium.
- Template literal endpoint with dynamic segment -> medium/low.
- Dynamic import unresolved -> low diagnostic, no fake high-confidence edge.

### 14.10 Graph persistence

Write:

```txt
.lutest/graph/latest-graph.json
.lutest/graph/snapshots/<scanId>.graph.json
```

Must validate graph schema before write.

---

## 15. Scan Pipeline Production Requirements

Scan modes:

```ts
type ScanMode = "static" | "browser" | "full";
```

Request:

```ts
type ScanRequest = {
  projectPath?: string;
  mode?: ScanMode;
  targetUrl?: string;
  routes?: string[];
};
```

Long scans should be job-based.

```ts
type ScanJobStatus =
  | "queued"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "cancelled";

type ScanJobResponse = {
  scanId: string;
  status: ScanJobStatus;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress: {
    step:
      | "validating-request"
      | "resolving-project"
      | "discovering-project"
      | "building-graph"
      | "running-static-rules"
      | "launching-browser"
      | "scanning-routes"
      | "running-visual-checks"
      | "writing-report"
      | "done";
    current?: number;
    total?: number;
    message?: string;
  };
  result?: ScanResponse;
  error?: ApiErrorResponse["error"];
};
```

Scan response:

```ts
type ScanIssueType =
  | "console"
  | "page-error"
  | "syntax"
  | "todo"
  | "large-file"
  | "maintainability"
  | "overflow"
  | "overlap"
  | "contrast"
  | "clipping"
  | "accessibility"
  | "network"
  | "storage"
  | "unknown";

type ScanIssue = {
  id: string;
  type: ScanIssueType;
  severity: "info" | "warning" | "error";
  message: string;
  filePath?: string;
  symbolId?: string;
  route?: string;
  screenshotPath?: string;
  evidence?: unknown;
};

type ScanResponse = {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  status: "passed" | "warning" | "failed";
  project: ProjectSummary;
  graphSummary: GraphSummary;
  routeCoverage: {
    discovered: number;
    scanned: number;
    skipped: number;
  };
  sourceFileCount: number;
  issues: ScanIssue[];
  artifacts: {
    graphPath: string;
    reportPath: string;
    screenshotDir?: string;
  };
};
```

Status rule:

```ts
if (issues.some(issue => issue.severity === "error")) status = "failed";
else if (issues.length > 0) status = "warning";
else status = "passed";
```

Concurrency:

- One full scan per project by default.
- If scan running, second request returns `SCAN_ALREADY_RUNNING` or queues depending config.
- User can cancel running scan.
- Browser always closed in `finally`.

---

## 16. Static Rule Engine Production Requirements

Initial production rules:

- `no-console`.
- `todo-comment`.
- `large-file`.
- `syntax-parse-error`.
- `unresolved-import`.
- `low-confidence-api-trace` diagnostic.

Constraints:

- Use bounded file reader.
- Respect max file size.
- Skip binary/generated/minified files.
- Thresholds from config, not hardcoded.
- Rule failure on one file must not crash entire scan.
- Each rule has unit tests.
- Issue type should be specific; avoid `unknown` if better type exists.

---

## 17. Playwright Browser Scan Requirements

Playwright starts only after P0/P1 gates pass.

Inputs:

- `targetUrl` from config/CLI/request.
- Routes from graph discovery or explicit config.
- Optional auth storage state.
- Viewport matrix from config.

For each route/viewport:

1. Navigate with timeout.
2. Capture console errors.
3. Capture page errors.
4. Capture failed network requests if enabled.
5. Capture screenshot.
6. Collect DOM bounding boxes.
7. Collect computed style needed for visual checks.
8. Attach evidence to issue.

Screenshot rules:

- Store under `.lutest/screenshots/<scanId>/`.
- Filename must be Windows-safe.
- Report stores relative normalized path.
- UI must be able to render preview.

---

## 18. Visual Engine Requirements

### 18.1 Overflow

Issue if:

```ts
left < 0 || top < 0 || right > viewportWidth || bottom > viewportHeight
```

### 18.2 AABB overlap

Formula:

```ts
a.left < b.right &&
a.right > b.left &&
a.top < b.bottom &&
a.bottom > b.top
```

Filters:

- hidden elements.
- parent-child natural overlap.
- modal/dropdown/tooltip recognized patterns.
- overlap area below threshold.
- duplicate element pairs.
- max issues per route.

### 18.3 Contrast

```txt
normal text >= 4.5
large text  >= 3.0
```

### 18.4 Runtime-to-source mapping

Visual issue must try to map:

```txt
route -> page node -> rendered component chain
```

Example:

```txt
route: /cart
issue: overflow
mapped source path:
  app/cart/page.tsx#CartPage
  components/CartTable.tsx#CartTable
```

If mapping is uncertain, evidence must mark medium/low confidence.

---

## 19. Report Module Production Requirements

Latest report response:

```ts
type LatestReportState =
  | { kind: "missing" }
  | { kind: "ok"; report: ScanResponse }
  | { kind: "malformed"; error: string }
  | { kind: "schema-invalid"; error: string }
  | { kind: "stale"; report: ScanResponse; reason: string }
  | { kind: "permission-denied"; error: string };

type LatestReportResponse = {
  state: LatestReportState;
};
```

Rules:

- Missing latest report is not an error; show empty state.
- Malformed JSON is an error.
- Schema invalid is an error.
- Permission denied is an error.
- Stale report should be explicit if project hash changed.
- Validate report before write.
- Atomic write if enabled.
- Write immutable report first, then update latest report.
- Never claim scan passed if report write failed.

---

## 20. Cache Diff Requirements

Opens only after graph/report stable.

Storage:

```txt
.lutest/hash.json
```

Flow:

1. Hash source files included by discovery.
2. Read previous hash result.
3. Compare changed files.
4. Map changed files to graph nodes.
5. Compute affected routes/components/API clients.
6. Suggest retest scope.
7. Fallback full scan if graph/hash missing or invalid.

API:

```txt
GET /api/cache/diff?path=<projectPath>
```

Response:

```ts
type CacheDiffResponse = {
  status: "ok" | "fallback-full-scan";
  changedFiles: string[];
  affectedNodeIds: string[];
  affectedRoutes: string[];
  reason?: string;
};
```

---

## 21. Auth Manual Flow Requirements

Auth is local-only.

Routes:

```txt
POST /api/actions/auth/start
POST /api/actions/auth/clear
GET  /api/auth/status
```

Storage:

```txt
.lutest/auth/storage-state.json
```

Rules:

- User manually logs in through Playwright browser.
- Worker saves storage state.
- Scan uses storage state if valid.
- Never log token/session/cookie values.
- Clear auth removes storage state.
- Invalid auth file results in clear error or fallback depending config.

---

## 22. Dashboard Production Requirements

Views:

- Overview.
- Project.
- Graph.
- Latest Report.
- Issues/Bugs.
- Screenshots.
- Scan Progress.
- Cache Diff.
- Auth Status if enabled.

Every API-backed view supports:

- loading.
- error.
- empty.
- stale.
- scanning/running.
- malformed report.
- path not allowed.

Graph UI must show:

- Graph mode: `file` or `symbol`.
- Node count by kind.
- Edge count by kind.
- Low-confidence diagnostics.
- Route-to-component-to-API trace.
- Click node -> file path, symbol name, loc, incoming/outgoing edges.

Issue UI must show:

- severity.
- issue type.
- route.
- source file/symbol if mapped.
- screenshot/evidence if available.
- confidence if mapping is uncertain.

Styling:

- Use OKLCH severity tokens.
- No hardcoded random colors inside components.
- Basic accessibility: keyboard usable, semantic buttons, visible focus.
- Large components split by domain.

---

## 23. Testing Requirements

Required fixtures:

```txt
fixtures/next-basic-shop
fixtures/next-custom-api-client
fixtures/vite-react-dashboard
fixtures/react-basic
fixtures/vue-basic
fixtures/laravel-basic
fixtures/php-basic
fixtures/invalid-package-json
fixtures/malformed-report
fixtures/path-policy
```

Required tests:

- Contracts: validators valid/invalid payload.
- Project discovery: framework fixtures, ignore dirs, max file count/size, package.json missing/malformed.
- Graph: AST declarations, nested components, imports, JSX render edges, hook -> client -> fetch trace, custom API client one-hop trace, unresolved/dynamic imports.
- Rule engine: each rule unit test, unreadable file, large/minified/generated file skip.
- Scan: passed/warning/failed, report write failure, cancellation, target unreachable.
- Report: missing, malformed, schema mismatch, stale, valid.
- CLI: invalid args, port conflict, worker timeout, Ctrl+C cleanup, exit code, npm pack install local tarball.
- UI: loading/error/empty/stale/scanning, no mock in main flow, report null/malformed handling, accessibility basics.

---

## 24. Release / Publish Gate

Do not publish until all gates pass.

Local product gate:

```bash
npm run typecheck
npm run build
npm test
```

Required e2e:

```bash
lutest scan fixtures/next-basic-shop --target-url http://localhost:3000
```

Expected:

- exit code matches scan status.
- `.lutest/latest-report.json` exists.
- `.lutest/reports/<scanId>.json` exists.
- `.lutest/graph/latest-graph.json` exists.
- screenshots exist if browser mode enabled.
- dashboard reads report.

NPM publish gate:

1. CLI package metadata correct.
2. `bin` points to built CLI.
3. `files` excludes fixtures, `node_modules`, `.lutest`, dev-only files.
4. `npm pack` pass.
5. Install tarball globally.
6. Run `lutest scan <fixturePath>`.
7. `npm publish --dry-run --access public` pass.
8. Publish only CLI package unless public API decision changes.

---

## 25. Production Roadmap

### P0 — Blocker

Must finish before feature expansion:

1. Runtime API validation.
2. Path security policy.
3. Report schema validation and read result type.
4. Contract/schema alignment.
5. AST symbol-level graph parser.
6. Component/API count based on declarations/symbols.
7. Import/render/call/http edges.
8. Fixture tests for graph and validators.

### P1 — Hardening

1. Rule engine file budget/config thresholds.
2. CORS/config cleanup.
3. UI error handling and component split.
4. CLI lifecycle hardening.
5. Config merge order + docs.
6. Test coverage for modules marked Done v1.

### P2 — Feature Expansion

Only after P0/P1:

1. Playwright browser automation.
2. Screenshot capture.
3. DOM bounding boxes.
4. Visual checks: overflow, AABB, contrast, clipping.
5. Auth storage-state flow.
6. Cache diff.
7. NPM publish.

---

## 26. Acceptance Criteria

Production-ready local core only when:

1. `lutest scan <projectPath>` runs end-to-end.
2. CLI validates args and exits with correct code.
3. Worker lifecycle is deterministic.
4. API request/response validation exists.
5. Path policy prevents unsafe arbitrary scanning.
6. Project discovery is tested with fixtures.
7. Graph is symbol-level for JS/TS/React/Next/Vite React.
8. Graph can trace page -> component -> hook/service -> API client -> endpoint for supported patterns.
9. Graph diagnostics mark unresolved/dynamic cases honestly.
10. Reports are schema validated.
11. Latest report distinguishes missing/malformed/schema-invalid/stale/ok.
12. Storage writes are reliable and failure is explicit.
13. Dashboard reads real APIs and handles all states.
14. Static scan produces typed issues.
15. Browser scan produces screenshot/runtime/visual issues when enabled.
16. Runtime issues can be mapped back to graph nodes when possible.
17. Tests cover critical modules.
18. `npm run typecheck`, `npm run build`, and tests pass.

Not production-ready if:

```txt
- Dashboard main flow still uses mock data.
- Scan route naming is inconsistent.
- API validation is TypeScript-only.
- Worker accepts arbitrary path without policy.
- Report read converts malformed JSON into null.
- Graph only counts files but claims symbol-level meaning.
- Component count is file count but presented as component declaration count.
- API count is file-with-fetch count but presented as endpoint/method count.
- Playwright scan can leave orphan browser/process.
- CLI cannot return deterministic exit code.
- No fixture tests for framework detection and graph semantics.
```

---

## 27. Example Production Workflow: Next.js Shop

Target project:

```txt
shop-next/
  package.json
  app/
    page.tsx
    products/page.tsx
    products/[id]/page.tsx
    cart/page.tsx
    api/checkout/route.ts
  components/
    ProductGrid.tsx
    ProductCard.tsx
    CartTable.tsx
    Price.tsx
  hooks/
    useProducts.ts
    useCart.ts
  lib/
    api-client.ts
    money.ts
```

Command:

```bash
lutest scan ./shop-next --target-url http://localhost:3000
```

Discovery:

```json
{
  "detectedFramework": "next",
  "sourceFileCount": 12
}
```

Graph symbols:

```txt
app/products/page.tsx#ProductsPage -> page
components/ProductGrid.tsx#ProductGrid -> component
components/ProductCard.tsx#ProductCard -> component
hooks/useProducts.ts#useProducts -> hook
lib/api-client.ts#getProducts -> api-client-method
http:GET /api/products -> external-endpoint
app/api/checkout/route.ts#POST -> api-route
```

Edges:

```txt
ProductsPage render ProductGrid
ProductGrid render ProductCard
ProductsPage call useProducts
useProducts call getProducts
getProducts http GET /api/products
CartPage call useCart
useCart call checkout
checkout route POST /api/checkout
```

Summary:

```json
{
  "fileCount": 12,
  "pageCount": 4,
  "componentCount": 4,
  "hookCount": 2,
  "apiRouteCount": 1,
  "apiClientMethodCount": 2,
  "externalEndpointCount": 2,
  "edgeCount": 14
}
```

Browser scan opens discovered routes:

```txt
/
/products
/cart
```

If `/cart` overflows:

```txt
route: /cart
issue: overflow
mapped source path:
  app/cart/page.tsx#CartPage
  components/CartTable.tsx#CartTable
```

Report writes:

```txt
.lutest/reports/<scanId>.json
.lutest/latest-report.json
.lutest/graph/latest-graph.json
.lutest/screenshots/<scanId>/cart__desktop.png
```

Dashboard renders real report and graph.

---

## 28. Migration Plan from MVP SRS

### M1 — Rename current status honestly

- Rename completed modules to `Done v1` unless DoD production passes.
- Mark current graph as `file-level graph v1`.
- Mark current scan as `static scan/report pipeline v1`.

### M2 — Contracts and validation

- Add runtime validators.
- Update API error model.
- Add route table tests.
- Align UI/client with canonical routes.

### M3 — Path/report integrity

- Add path policy.
- Add JSON read result type.
- Add report schema validation.
- Add stale report detection.

### M4 — Symbol graph

- Add AST parser.
- Add symbol extractor.
- Add import resolver.
- Add JSX/render/call/API trace.
- Add fixtures.

### M5 — Production scan

- Add scan job manager.
- Add typed issue taxonomy.
- Add route coverage.
- Add atomic report write.

### M6 — Browser/visual

- Add Playwright runner.
- Add screenshot storage.
- Add DOM boxes.
- Add visual checks.
- Add source mapping.

### M7 — Release readiness

- Harden CLI lifecycle.
- Build dashboard production flow.
- npm pack/dry-run.
- Publish alpha only after gates pass.

---

## 29. Engineering Rules

Production code must follow:

- No mock in production flow.
- No placeholder route that returns fake success.
- No `any` in public service/contract boundary without documented reason.
- No `as unknown as Type` to bypass contracts.
- No field in API response outside contracts.
- No hardcoded route divergence.
- No hardcoded `.lutest` path outside path service.
- No arbitrary `process.cwd()` in worker services.
- No broad catch returning `null` for all storage errors.
- No graph metric displayed without definition.
- No scan passed status if report write failed.

---

## 30. Final Product Definition

Lutest production local product is complete when it can reliably run on a real user project and produce a trustworthy technical report that connects:

```txt
source architecture
  -> graph nodes/edges
  -> route coverage
  -> static/runtime/visual issues
  -> evidence/screenshots
  -> mapped source files/symbols
```

The product is not production-grade if it only scans files, counts rough node types, and displays a dashboard without trustworthy graph semantics and report integrity.
