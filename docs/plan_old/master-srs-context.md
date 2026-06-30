# MASTER SRS CONTEXT: LUTEST

## 1. Tổng Quan Dự Án (Project Overview)

### 1.1. Mục tiêu chính

Lutest là công cụ kiểm thử local-first cho dự án web. Người dùng chạy một lệnh CLI `lutest` tại máy local để khởi động hệ thống kiểm tra dự án hiện tại hoặc dự án được chỉ định.

Lutest phải thực hiện các nhiệm vụ chính sau:

1. Khởi động Node.js host CLI.
2. Host CLI spawn Node.js + Express worker.
3. Worker cung cấp local API cho dashboard và scan engine.
4. Worker đọc thông tin project target.
5. Worker nhận diện framework của project target ở mức cơ bản.
6. Worker xây dựng graph sơ bộ từ source files.
7. Worker chạy scan bằng Playwright trên target web app đang chạy.
8. Worker phát hiện lỗi cơ bản về UI/UX và runtime.
9. Worker lưu kết quả vào thư mục `.lutest/` bên trong project target.
10. Dashboard local đọc API thật và hiển thị project, graph, report, bugs, screenshots.

Phiên bản 8 tuần đầu chỉ tập trung vào local core usable. Không xây cloud, không build SaaS, không thêm account system, không thêm billing, không thêm remote sync.

### 1.2. Đối tượng sử dụng

Đối tượng sử dụng chính:

1. Developer cá nhân muốn kiểm tra nhanh dự án web local.
2. Frontend developer muốn phát hiện lỗi UI cơ bản trước khi demo hoặc merge.
3. Full-stack developer muốn có dashboard local để xem graph, report, bugs, screenshots.
4. Người phát triển Lutest cần một nền kiến trúc sạch để mở rộng các phase sau.

### 1.3. Phạm vi sản phẩm trong phase đầu

Phạm vi bắt buộc:

- CLI local command `lutest`.
- Node host lifecycle.
- Express worker lifecycle.
- Local API.
- Project detection.
- Framework detection cơ bản.
- Graph extraction cơ bản.
- Scan engine Playwright.
- Report latest.
- Screenshot storage.
- Dashboard đọc data thật.
- Runtime storage `.lutest/`.
- TypeScript contracts dùng chung.

Ngoài phạm vi phase đầu:

- Cloud dashboard.
- User account.
- Team workspace.
- Billing.
- CI SaaS.
- AI tự sửa code.
- Visual AI model phức tạp.
- Report history nâng cao.
- Auth automation nâng cao.
- Multi-machine sync.

---

## 2. Công Nghệ Sử Dụng (Tech Stack & Architecture)

### 2.1. Monorepo structure

Cấu trúc repo chuẩn:

```txt
lutest/
  apps/
    cli-host/
    worker-node/
    ui/
  packages/
    contracts/
  docs/
    plan/
    report/
  scripts/
  package.json
  turbo.json
```

Ý nghĩa:

- `apps/cli-host`: Node.js CLI host. Chịu trách nhiệm đọc config, spawn worker, health check, shutdown.
- `apps/worker-node`: Node.js + Express worker. Chứa local API, scan engine, project reader, graph builder, report writer.
- `apps/ui`: Dashboard local.
- `packages/contracts`: TypeScript types dùng chung giữa host, worker, UI.
- `docs/plan`: Roadmap, SRS, kế hoạch kỹ thuật.
- `docs/report`: Scripts/tài liệu report.

### 2.2. Frontend

Frontend dashboard:

- Framework: chưa chốt final trong code hiện tại, nhưng roadmap yêu cầu `apps/ui` là local dashboard.
- Language: TypeScript.
- Data source: gọi API từ worker Express.
- Runtime: chạy local.
- State management phase đầu: component state + fetch layer đơn giản.
- Không dùng mock sau khi API thật đã có.

Dashboard tối thiểu phải có các view sau:

1. Overview.
2. Project.
3. Graph.
4. Latest Report.
5. Bugs.
6. Auth status nếu auth manual flow được bật.
7. Cache diff nếu cache diff được triển khai.

Dashboard phải gọi các API:

```txt
GET  /api/status
GET  /api/project
GET  /api/graph
GET  /api/report/latest
POST /api/actions/scan
```

Nếu route scan hiện tại vẫn là `/api/scan`, cần thống nhất route trước khi dashboard dùng thật.

### 2.3. Backend

Backend chính là worker:

- Runtime: Node.js.
- Framework: Express.js.
- Language: TypeScript.
- API style: local HTTP JSON API.
- Error response: JSON chuẩn theo `ApiErrorResponse`.
- Main package: `apps/worker-node`.

Worker hiện có các module chính:

```txt
apps/worker-node/src/
  app.ts
  main.ts
  modules/
    status/
    project/
    graph/
    scan/
    report/
    rule/
  shared/
    middleware/
    services/
```

Routes bắt buộc:

```txt
GET /api/status
GET /api/project
GET /api/graph
GET /api/report/latest
POST /api/scan hoặc POST /api/actions/scan
```

Tên route scan phải được chốt thành một chuẩn. Khuyến nghị dùng:

```txt
POST /api/actions/scan
```

Nếu giữ `/api/scan`, toàn bộ docs, UI, contracts phải dùng đúng `/api/scan`.

### 2.4. CLI Host

Host CLI:

- Runtime: Node.js.
- Language: TypeScript.
- Dev runner: `tsx`.
- Build: `tsc`.
- Package: `apps/cli-host`.
- Command output: `lutest`.

CLI host phải làm đúng các việc sau:

1. Parse command và flags.
2. Load config.
3. Resolve project target path.
4. Spawn worker process.
5. Health check worker qua `/api/status`.
6. In dashboard URL.
7. In project path.
8. In target URL nếu có.
9. Bắt Ctrl+C.
10. Shutdown worker sạch.

Command chính:

```bash
lutest
```

Dev command:

```bash
npm run dev -w @lutest/cli-host
```

Build command:

```bash
npm run build -w @lutest/cli-host
```

### 2.5. Contracts

Package contracts:

```txt
packages/contracts/src/index.ts
```

Contracts hiện có các nhóm type:

- `ApiErrorResponse`
- `StatusResponse`
- `ProjectSummary`
- `DetectedFramework`
- `GraphNode`
- `GraphEdge`
- `GraphSummary`
- `GraphResponse`
- `ScanRequest`
- `ScanIssue`
- `ScanResponse`
- `LatestReportResponse`

Quy tắc bắt buộc:

- Worker không được trả response ngoài schema contracts.
- UI không tự đoán field ngoài contracts.
- Khi đổi schema, phải sửa đồng bộ:
  - `packages/contracts`
  - worker mapper/service/repository
  - UI fetch/render
  - docs nếu field public.

### 2.6. Database

Phase đầu không dùng database server.

Storage chính là file local trong project target:

```txt
.lutest/
  latest-report.json
  graph/
    latest-graph.json
  screenshots/
  hash.json
  auth/
    storage-state.json
  reports/
    <scanId>.json
```

Quy tắc:

- `.lutest/` luôn nằm trong root của project target.
- Không lưu runtime data vào repo Lutest trừ khi chính Lutest là project target.
- Không hardcode `.lutest` path rải rác.
- Mọi path phải đi qua `pathService.resolveProjectPaths`.
- Mọi ghi/đọc JSON nên đi qua `storageService`.

### 2.7. Infrastructure

Phase đầu không có cloud infra.

Infrastructure local gồm:

- Node.js.
- npm workspaces.
- TypeScript.
- Express.
- Playwright.
- Local filesystem.
- Local dashboard.
- Git.

Không yêu cầu:

- Docker cho phase đầu.
- AWS.
- Nginx.
- PostgreSQL.
- MongoDB.
- Redis.

### 2.8. Kiến trúc tổng thể

Luồng runtime:

```txt
User Terminal
  -> lutest CLI
    -> CLI Host loads config
    -> CLI Host starts Worker Process
      -> Worker Express API
        -> Project Reader
        -> Graph Builder
        -> Scan Engine
        -> Report Writer
      -> Dashboard reads Worker API
```

Runtime storage:

```txt
Target Project Root
  -> .lutest/
    -> latest-report.json
    -> graph/latest-graph.json
    -> screenshots/
    -> hash.json
    -> auth/storage-state.json
    -> reports/
```

---

## 3. Luồng Nghiệp Vụ Chính (Core Workflows)

### Luồng 1: Khởi động Lutest bằng CLI

Actor: Developer.

Input:

```bash
lutest
```

Các bước bắt buộc:

1. CLI host khởi động.
2. CLI host load config theo thứ tự:
   1. default config
   2. `.env`
   3. `lutest.yaml`
   4. env override
   5. CLI flags
3. CLI host resolve project target path.
4. CLI host chọn worker port.
5. CLI host spawn worker Node process.
6. CLI host đọc stdout/stderr worker.
7. CLI host gọi health check:

```txt
GET /api/status
```

8. Nếu health check thành công, CLI host in:
   - dashboard URL
   - project path
   - target URL nếu có
   - worker port
9. Nếu health check thất bại, CLI host in lỗi rõ ràng và stop process.

Output thành công:

```txt
Lutest worker ready
Dashboard: http://localhost:<port>
Project: <absolute project path>
```

Output thất bại phải có:

- error code hoặc message rõ.
- nguyên nhân có thể hiểu được.
- không swallow error.
- worker child process phải được cleanup nếu startup fail.

### Luồng 2: Worker status check

Actor: CLI host hoặc dashboard.

Endpoint:

```txt
GET /api/status
```

Response bắt buộc:

```ts
{
  status: "ok" | "error",
  uptime: number,
  service: "lutest-worker",
  runtime: "node",
  env: string
}
```

Rule:

- `status` phải là `"ok"` khi worker sẵn sàng.
- `uptime` là số giây process đã chạy.
- Không trả HTML.
- Không throw raw stacktrace ra client.

### Luồng 3: Project detection

Actor: Dashboard hoặc scan engine.

Endpoint:

```txt
GET /api/project
```

Input optional:

```txt
?path=<absolute-or-relative-project-path>
```

Worker phải:

1. Resolve project root bằng `pathService`.
2. Check `package.json`.
3. Đọc package name nếu có.
4. Merge `dependencies` và `devDependencies`.
5. Detect framework theo rule rõ ràng.
6. Nếu Node framework unknown, check PHP/Laravel signs.
7. Đếm source files.
8. Trả `ProjectSummary`.

Detected framework values hợp lệ:

```ts
"next" | "vite-react" | "react" | "vue" | "laravel" | "php" | "unknown" | null
```

Khuyến nghị loại bỏ `null` khỏi contract sau khi ổn định. Phase hiện tại vẫn có `null` trong type nên code phải handle được `null`.

Detection rules phase đầu:

1. Nếu dependency có `next` -> `"next"`.
2. Nếu dependency có `vite` và `react` -> `"vite-react"`.
3. Nếu dependency có `react` -> `"react"`.
4. Nếu dependency có `vue` -> `"vue"`.
5. Nếu có `artisan` hoặc `composer.json` -> `"laravel"`.
6. Nếu có `index.php` -> `"php"`.
7. Nếu không match -> `"unknown"`.

Response:

```ts
{
  name: string,
  rootDir: string,
  lutestDir: string,
  packageJsonExists: boolean,
  detectedFramework: DetectedFramework,
  sourceFileCount?: number
}
```

### Luồng 4: Graph extraction

Actor: Dashboard hoặc scan engine.

Endpoint:

```txt
GET /api/graph
```

Input optional:

```txt
?path=<absolute-or-relative-project-path>
```

Worker phải:

1. Resolve project root.
2. List source files theo extensions:
   - `.ts`
   - `.tsx`
   - `.js`
   - `.jsx`
   - `.php` nếu graph hỗ trợ PHP ở phase đó
3. Ignore dirs:
   - `node_modules`
   - `.git`
   - `dist`
   - `build`
   - `.next`
   - `.lutest`
4. Tạo nodes.
5. Tạo edges import ở mức cơ bản nếu import parser đã có.
6. Tạo summary.
7. Ghi snapshot vào:

```txt
.lutest/graph/latest-graph.json
```

Graph node types hợp lệ:

```ts
"page" | "component" | "api" | "file"
```

Graph edge types hợp lệ:

```ts
"import" | "use" | "call"
```

Response:

```ts
{
  nodes: GraphNode[],
  edges: GraphEdge[],
  summary: {
    pageCount: number,
    componentCount: number,
    apiCount: number,
    fileCount: number
  }
}
```

Node schema:

```ts
{
  id: string,
  type: GraphNodeType,
  label: string,
  filePath: string
}
```

Edge schema:

```ts
{
  id: string,
  type: GraphEdgeType,
  source: string,
  target: string
}
```

Rule:

- Không trả `generatedAt` nếu contract không có.
- Không trả `data` nếu contract không có.
- Không dùng generic `GraphEdge<T>` nếu contract không định nghĩa generic.
- Graph không được empty nếu project có source files hợp lệ, trừ khi collector lỗi hoặc path sai.
- Nếu graph empty, response vẫn phải hợp lệ và summary count = 0.

### Luồng 5: Scan project local

Actor: Developer qua dashboard hoặc CLI.

Endpoint khuyến nghị:

```txt
POST /api/actions/scan
```

Endpoint hiện tại có thể là:

```txt
POST /api/scan
```

Phải chốt một endpoint duy nhất trước khi UI tích hợp thật.

Input:

```ts
{
  projectPath?: string
}
```

Worker scan flow:

1. Resolve project paths.
2. Discover project.
3. Build graph.
4. Nếu target URL được config, dùng target URL để scan browser.
5. Nếu chưa có Playwright phase, chạy rule engine file-based trước.
6. Khi Playwright phase sẵn sàng:
   1. Launch Chromium.
   2. Visit từng route.
   3. Capture screenshot.
   4. Collect console errors.
   5. Collect page errors.
   6. Collect DOM bounding boxes.
   7. Run visual checks.
7. Build `ScanResponse`.
8. Ghi report vào:
   - `.lutest/latest-report.json`
   - `.lutest/reports/<scanId>.json`
9. Trả response JSON.

ScanResponse:

```ts
{
  scanId: string,
  startedAt: string,
  finishedAt: string,
  status: "passed" | "failed" | "warning",
  project: ProjectSummary,
  sourceFileCount: number,
  issues: ScanIssue[],
  reportPath: string
}
```

ScanIssue:

```ts
{
  id: string,
  type: "console" | "syntax" | "overflow" | "unknown",
  severity: "info" | "warning" | "error",
  message: string,
  filePath?: string
}
```

Scan status rule:

- Nếu có issue severity `"error"` -> `"failed"`.
- Nếu có issue bất kỳ nhưng không có `"error"` -> `"warning"`.
- Nếu không có issue -> `"passed"`.

### Luồng 6: Report latest

Actor: Dashboard.

Endpoint:

```txt
GET /api/report/latest
```

Worker phải:

1. Resolve project paths.
2. Đọc file:

```txt
.lutest/latest-report.json
```

3. Nếu file tồn tại và JSON valid, trả report.
4. Nếu file không tồn tại, trả:

```ts
{
  report: null
}
```

5. Nếu JSON malformed, trả error response rõ ràng hoặc `report: null` kèm error metadata nếu contract hỗ trợ.

Không được crash worker khi report thiếu.

### Luồng 7: Screenshot storage

Actor: Scan engine.

Storage path:

```txt
.lutest/screenshots/
```

Quy tắc:

- Mỗi route scan có thể có một screenshot riêng.
- Tên file phải an toàn với Windows path.
- Không dùng raw URL làm filename nếu URL chứa ký tự không hợp lệ.
- Report phải lưu relative path hoặc absolute path nhất quán.
- Dashboard phải render được screenshot path đó.

### Luồng 8: Visual checks cơ bản

Visual checks phase đầu gồm:

1. Overflow.
2. AABB overlap.
3. Contrast ratio.
4. Text clipping nếu làm kịp.

#### Overflow check

Input:

- DOM element bounding box.
- viewport width.
- viewport height.

Rule:

```ts
left < 0
top < 0
right > viewportWidth
bottom > viewportHeight
```

Nếu match, tạo issue type `"overflow"`.

#### AABB overlap check

Formula:

```ts
a.left < b.right &&
a.right > b.left &&
a.top < b.bottom &&
a.bottom > b.top
```

Filter bắt buộc:

- Bỏ hidden elements.
- Bỏ parent-child overlap bình thường.
- Bỏ modal/dropdown/tooltip nếu được nhận diện.
- Bỏ overlap quá nhỏ dưới threshold.
- Không báo trùng lặp quá nhiều issue cho cùng một cặp element.

#### Contrast check

Rule WCAG phase đầu:

- Text thường: contrast ratio >= 4.5.
- Text lớn: contrast ratio >= 3.

Nếu thấp hơn threshold, tạo warning hoặc error tùy severity policy.

#### OKLCH severity colors

Dashboard phải dùng token màu severity rõ ràng:

```css
--severity-critical: oklch(...);
--severity-warning: oklch(...);
--severity-info: oklch(...);
--severity-success: oklch(...);
```

Mapping phase đầu:

- error -> critical color.
- warning -> warning color.
- info -> info color.
- passed/success -> success color.

### Luồng 9: Dashboard đọc data thật

Dashboard flow:

1. Load Overview.
2. Fetch `/api/status`.
3. Fetch `/api/project`.
4. Fetch `/api/graph`.
5. Fetch `/api/report/latest`.
6. Nếu chưa có report, hiển thị empty state rõ ràng.
7. Khi user click Scan, gọi scan endpoint.
8. Sau scan, refetch latest report.
9. Render bugs list.
10. Render screenshot preview nếu report có screenshot fields.

Rule:

- Không dùng mock data sau khi API thật có.
- Loading state phải rõ.
- Error state phải rõ.
- Empty state phải rõ.
- Không crash UI khi `report: null`.
- Không assume field không có trong contracts.

### Luồng 10: Auth manual flow

Phase: tuần 6, có thể defer nếu chậm.

Endpoints dự kiến:

```txt
POST /api/actions/auth/start
POST /api/actions/auth/clear
GET  /api/auth/status
```

Storage:

```txt
.lutest/auth/storage-state.json
```

Flow:

1. User click start auth.
2. Worker mở browser.
3. User login thủ công.
4. Worker lưu Playwright storage state.
5. Scan sau đó dùng storage state nếu tồn tại.
6. User có thể clear auth state.

Rule:

- Không lưu password.
- Không log token/session content.
- Auth file nằm local trong `.lutest/auth/`.
- Nếu auth file lỗi, scan fallback hoặc báo lỗi rõ.

### Luồng 11: Cache diff

Phase: tuần 6, có thể defer nếu chậm.

Storage:

```txt
.lutest/hash.json
```

Flow:

1. Tính hash source files hiện tại.
2. Đọc hash trước đó.
3. So sánh changed files.
4. Map changed files sang affected graph nodes nếu có.
5. Suggest routes cần retest.
6. Dashboard hiển thị changed files và affected nodes.

Rule:

- Nếu hash file thiếu, fallback full scan.
- Nếu graph thiếu, fallback full scan.
- Không block scan vì cache diff lỗi.

---

## 4. Danh Sách Tính Năng Tổng Thể (Feature Backlog)

### 4.1. Foundation / Monorepo

- [x] Tạo monorepo với `apps/*` và `packages/*`.
- [x] Tạo `apps/cli-host`.
- [x] Tạo `apps/worker-node`.
- [x] Tạo `packages/contracts`.
- [ ] Tạo hoặc hoàn thiện `apps/ui`.
- [x] Cấu hình root `package.json`.
- [x] Cấu hình TypeScript workspace.
- [x] Cấu hình script `typecheck`.
- [ ] Cấu hình lint thực sự nếu hiện tại workspace chưa có lint script con.
- [ ] Thêm `.editorconfig`.
- [ ] Thêm Prettier nếu dự án quyết định dùng.

### 4.2. CLI Host

- [x] Có package `@lutest/cli-host`.
- [ ] Chốt `bin.lutest` trong `apps/cli-host/package.json`.
- [ ] Implement command `lutest --help`.
- [ ] Implement command `lutest version`.
- [ ] Implement config loader.
- [ ] Implement config merge order: defaults, `.env`, `lutest.yaml`, env override, CLI flags.
- [ ] Implement worker process manager.
- [ ] Implement worker health checker.
- [ ] Implement graceful shutdown.
- [ ] Implement clear startup logs.
- [ ] Test Windows path có khoảng trắng.
- [ ] Test port conflict.
- [ ] Test worker startup timeout.

### 4.3. Worker Express

- [x] Có Express app.
- [x] Có route `/api/status`.
- [x] Có route `/api/project`.
- [x] Có route `/api/graph`.
- [x] Có route report latest.
- [x] Có scan route.
- [x] Có not found middleware.
- [x] Có error handler middleware.
- [ ] Chuẩn hóa request logger.
- [ ] Chuẩn hóa toàn bộ error response theo `ApiErrorResponse`.
- [ ] Chốt route scan thành `/api/actions/scan` hoặc giữ `/api/scan`.
- [ ] Serve dashboard static assets.

### 4.4. Path & Storage

- [x] Có `pathService.resolveProjectPaths`.
- [x] Có `ProjectPaths`.
- [x] Có `lutestDir`.
- [x] Có `graphDir`.
- [x] Có `screenshotsDir`.
- [x] Có `authDir`.
- [x] Có `reportDir`.
- [x] Có `latestReportPath`.
- [x] Có `latestGraphPath`.
- [x] Có `hashPath`.
- [x] Có `authStorageStatePath`.
- [x] Có `storageService`.
- [x] Có `storageService.writeJson`.
- [x] Có `storageService.readJson`.
- [ ] Đảm bảo mọi module không hardcode `.lutest/latest-report.json`.
- [ ] Đảm bảo mọi module không tự dùng `process.cwd()` khi có thể truyền path rõ ràng.

### 4.5. Project Detection

- [x] Đọc `package.json`.
- [x] Detect `next`.
- [x] Detect `vite-react`.
- [x] Detect `react`.
- [x] Detect `vue`.
- [x] Detect `laravel`.
- [x] Detect `php`.
- [x] Trả `sourceFileCount`.
- [ ] Thêm fixture test cho Next.js.
- [ ] Thêm fixture test cho Vite React.
- [ ] Thêm fixture test cho Vue.
- [ ] Thêm fixture test cho Laravel.
- [ ] Thêm fixture test cho PHP thường.
- [ ] Quyết định loại bỏ `null` khỏi `DetectedFramework` hay giữ tương thích.

### 4.6. Graph

- [x] Có `GraphNode`.
- [x] Có `GraphEdge`.
- [x] Có `GraphSummary`.
- [x] Có `GraphResponse`.
- [x] Build graph từ source files.
- [x] Classify page/component/api/file ở mức cơ bản.
- [x] Route `/api/graph` trả graph thật.
- [x] Repository lưu latest graph.
- [ ] Parse import edges thật nếu graph service hiện tại chưa parse imports.
- [ ] Tạo unit test cho graph builder.
- [ ] Đảm bảo graph snapshot được ghi vào `.lutest/graph/latest-graph.json`.
- [ ] Hỗ trợ PHP/Laravel graph ở mức route/controller nếu cần phase sau.

### 4.7. Scan Engine

- [x] Có `ScanRequest`.
- [x] Có `ScanIssue`.
- [x] Có `ScanResponse`.
- [x] Có scan service.
- [x] Có scan repository.
- [x] Có scan mapper status rule.
- [x] Có report writer vào latest và reports.
- [ ] Chốt endpoint scan duy nhất.
- [ ] Cài Playwright.
- [ ] Implement browser launch.
- [ ] Implement route discovery từ graph/config.
- [ ] Implement target navigation.
- [ ] Collect console errors.
- [ ] Collect page errors.
- [ ] Capture screenshot.
- [ ] Collect DOM bounding boxes.
- [ ] Implement overflow check.
- [ ] Implement AABB overlap check.
- [ ] Implement contrast check.
- [ ] Implement text clipping nếu còn scope.
- [ ] Test scan target URL chết.
- [ ] Test browser missing error.

### 4.8. Report

- [x] Có latest report response.
- [x] Ghi `.lutest/latest-report.json`.
- [x] Ghi `.lutest/reports/<scanId>.json`.
- [x] Đọc latest report.
- [ ] Validate report JSON trước khi trả dashboard.
- [ ] Thêm screenshot fields vào report contract khi Playwright có screenshot.
- [ ] Thêm routes scanned vào report contract khi route scan có.
- [ ] Thêm scan scope vào report contract khi scan modes có.
- [ ] Thêm tests cho missing report.
- [ ] Thêm tests cho malformed report.

### 4.9. Dashboard

- [ ] Tạo dashboard shell.
- [ ] Tạo fetch client.
- [ ] Tạo Overview view.
- [ ] Tạo Project view.
- [ ] Tạo Graph view.
- [ ] Tạo Latest Report view.
- [ ] Tạo Bugs view.
- [ ] Tạo empty state khi chưa có report.
- [ ] Tạo loading state.
- [ ] Tạo error state.
- [ ] Tạo scan button.
- [ ] Refetch report sau scan.
- [ ] Render screenshot preview.
- [ ] Thêm OKLCH severity tokens.
- [ ] Bỏ toàn bộ mock data khỏi dashboard khi API thật sẵn sàng.

### 4.10. Auth Manual Flow

- [ ] Tạo auth storage path.
- [ ] Implement `POST /api/actions/auth/start`.
- [ ] Implement `POST /api/actions/auth/clear`.
- [ ] Implement `GET /api/auth/status`.
- [ ] Mở browser cho manual login.
- [ ] Save Playwright storage state.
- [ ] Dùng storage state trong scan.
- [ ] Không log secret/token.
- [ ] Test clear auth.
- [ ] Test scan route protected.

### 4.11. Cache Diff

- [ ] Tạo file hash store `.lutest/hash.json`.
- [ ] Hash source files.
- [ ] So sánh previous/current hash.
- [ ] Tạo route `/api/cache/diff`.
- [ ] Map changed files sang graph nodes.
- [ ] Suggest routes retest.
- [ ] UI hiển thị changed files.
- [ ] Fallback full scan nếu diff lỗi.

### 4.12. Docs / QA / Release

- [x] Có roadmap 8 tuần.
- [x] Có Master SRS Context.
- [ ] README cài đặt.
- [ ] README chạy dev.
- [ ] README chạy build.
- [ ] Docs config `lutest.yaml`.
- [ ] Docs scan.
- [ ] Docs auth.
- [ ] Manual test checklist.
- [ ] Cross-platform test Windows.
- [ ] Cross-platform test Linux.
- [ ] Demo release checklist.
- [ ] Release notes nội bộ.

---

## 5. Quy Tắc Code & Ràng Buộc (Coding Standards & Constraints) - QUAN TRỌNG ĐỂ TRÁNH LỖI

### 5.1. Quy tắc chống placeholder

KIÊM QUYẾT:

- Không được viết code dạng placeholder.
- Không được để comment kiểu:

```ts
// Code tiếp tại đây...
// TODO: implement later
// mock for now
// temporary fake
```

trong code production nếu task yêu cầu feature hoàn chỉnh.

Nếu một feature chưa làm, phải:

1. Không expose như feature đã xong.
2. Hoặc trả lỗi rõ:

```ts
throw new Error("Feature not implemented: <feature-name>");
```

3. Hoặc ghi rõ trong docs/backlog là chưa làm.

Không được tạo function trả data giả nếu route được coi là API thật.

### 5.2. TypeScript rules

Bắt buộc:

- Dùng TypeScript cho host, worker, contracts, UI.
- Không dùng `any` trừ khi có lý do rõ và sẽ được thay thế ngay.
- Function public phải có input/output type rõ.
- Response API phải dùng type từ `@lutest/contracts`.
- Không cast `as unknown as Type` để né lỗi schema.
- Không dùng generic type nếu contract không định nghĩa generic.
- Không thêm field vào response nếu contract không có field đó.

Khuyến nghị sửa:

- `scanMapper.toScanResponse(input: any)` nên được thay bằng interface input rõ ràng.

### 5.3. Contracts-first rule

Mọi API public phải đi từ contracts.

Khi thêm field:

1. Sửa `packages/contracts/src/index.ts`.
2. Sửa mapper.
3. Sửa service.
4. Sửa repository nếu cần.
5. Sửa route response.
6. Sửa UI.
7. Chạy:

```bash
npm run typecheck
```

Không được sửa worker response đơn lẻ rồi để UI tự đoán.

### 5.4. Error Handling

Backend:

- Route async phải bọc `try/catch` hoặc dùng async wrapper.
- Error phải được chuyển vào Express `next(error)`.
- Error handler phải trả JSON.
- Không trả raw stacktrace ở production mode.
- Error message phải có thông tin hành động được.

Frontend:

- Mọi fetch phải handle:
  - loading
  - error
  - empty data
  - malformed data nếu có validation
- UI không crash khi API trả `report: null`.
- UI không assume arrays luôn tồn tại nếu response failed.

CLI:

- Startup error phải in rõ:
  - worker command fail
  - port conflict
  - project path invalid
  - health timeout
  - config parse fail
- Ctrl+C phải cleanup worker.

### 5.5. Path rules

Bắt buộc:

- Không dùng `process.cwd()` bừa bãi trong worker.
- Route/service phải nhận hoặc resolve project path qua `pathService.resolveProjectPaths`.
- `.lutest/` phải nằm trong project target root.
- Không dùng string concat để build path.
- Dùng `node:path`.
- Normalize path khi response cần cross-platform consistency.
- Ignore `.lutest` khi scan/list source files.

Không được hardcode:

```ts
path.join(root, ".tlx")
path.join(root, ".lutest", "latest-report.json")
```

Nếu cần latest report path, dùng:

```ts
paths.latestReportPath
```

Nếu cần latest graph path, dùng:

```ts
paths.latestGraphPath
```

### 5.6. Storage rules

Bắt buộc:

- Ghi JSON qua `storageService.writeJson`.
- Đọc JSON qua `storageService.readJson` hoặc service tương đương.
- Tạo folder bằng `fs.mkdir(..., { recursive: true })`.
- Không crash nếu latest report chưa tồn tại.
- Không crash nếu latest graph chưa tồn tại.
- Không lưu secret ra logs.

### 5.7. State Management

Phase đầu dashboard:

- Dùng local component state hoặc lightweight fetch state.
- Không thêm Redux/Zustand nếu chưa có nhu cầu rõ.
- Data source chính là worker API.
- Cache UI chỉ là cache tạm trong runtime browser.
- Source of truth là API + `.lutest/` files.

Backend state:

- Không giữ report quan trọng chỉ trong memory.
- Report phải persist vào `.lutest/`.
- Graph snapshot phải persist vào `.lutest/graph/`.
- Auth state persist vào `.lutest/auth/storage-state.json`.

CLI state:

- Không cần persistent state phase đầu.
- CLI chỉ giữ process state runtime.

### 5.8. Logging rules

Host logs phải có:

- starting worker
- worker command
- worker ready
- dashboard URL
- project path
- target URL nếu có
- worker failed
- shutdown complete

Worker logs phải có:

- server started
- request errors
- scan started
- scan finished
- report path
- graph generated
- storage write errors

Không log:

- auth token
- cookies
- storage-state content
- full env dump
- sensitive paths nếu user cấu hình private, trừ project path cần thiết trong local logs.

### 5.9. Testing / Verification rules

Sau mỗi thay đổi code TypeScript phải chạy:

```bash
npm run typecheck
```

Nếu có lint script thật:

```bash
npm run lint
```

Trước khi xem một phase là xong, phải manual verify bằng API hoặc CLI.

Definition of Done tối thiểu cho local core:

1. `npm run typecheck` pass.
2. `lutest` chạy được.
3. Worker health OK.
4. `/api/project` trả project thật.
5. `/api/graph` trả graph thật.
6. Scan tạo report thật.
7. `.lutest/latest-report.json` tồn tại.
8. Dashboard đọc report thật.
9. Không còn mock ở luồng demo chính.

### 5.10. API route naming rules

Route naming phải nhất quán.

Routes chuẩn:

```txt
GET  /api/status
GET  /api/project
GET  /api/graph
GET  /api/report/latest
POST /api/actions/scan
POST /api/actions/auth/start
POST /api/actions/auth/clear
GET  /api/auth/status
GET  /api/cache/diff
```

Nếu code hiện tại dùng route khác, phải tạo migration rõ hoặc sửa docs/code đồng bộ.

Không để docs ghi `/api/actions/scan` trong khi code chỉ có `/api/scan` nếu dashboard đang dùng docs để implement.

### 5.11. Scan constraints

Phase đầu không cố scan hoàn hảo.

Ưu tiên:

1. Chạy được.
2. Có report thật.
3. Có screenshot thật.
4. Có issue thật.
5. False positive không quá vô lý.

Không ưu tiên phase đầu:

- AI visual reasoning.
- Pixel-perfect diff.
- Multi-browser matrix.
- Mobile device matrix.
- Full accessibility audit.
- Deep framework-specific static analysis.

### 5.12. Graph constraints

Graph phase đầu không cần hoàn hảo.

Bắt buộc:

- Không empty vô lý.
- Có file nodes.
- Có page/component/api classification cơ bản.
- Có summary đúng.
- Có latest graph snapshot.

Không bắt buộc phase đầu:

- Full AST call graph.
- Dynamic import resolution hoàn chỉnh.
- Alias resolution phức tạp.
- Laravel route-controller relation đầy đủ.

### 5.13. UI constraints

Dashboard phải rõ, không cần quá polish ở phase đầu.

Bắt buộc:

- Không mock khi API thật có.
- Không crash khi API lỗi.
- Không crash khi report null.
- Có scan button nếu scan API sẵn sàng.
- Có severity display.
- Có project summary.
- Có graph summary.
- Có latest report summary.
- Có bugs list.

Polish nâng cao để tuần 8:

- summary cards đẹp.
- screenshot preview tốt.
- better empty states.
- OKLCH severity color tuning.
- responsive layout.

### 5.14. Security constraints

- Lutest chạy local-first.
- Không gửi source code lên server ngoài.
- Không upload report ra cloud trong phase đầu.
- Không log cookies/token.
- Auth storage nằm local trong `.lutest/auth/`.
- Nếu thêm network/cloud sau này, phải có consent rõ.

### 5.15. Cross-platform constraints

Bắt buộc hỗ trợ:

- Windows.
- Linux.

Rules:

- Không assume shell Unix.
- Không hardcode `/`.
- Không hardcode `\`.
- Không dùng command chain không tương thích nếu không cần.
- Với Node code, dùng `node:path`.
- Với response path public, normalize sang `/` nếu UI cần.

### 5.16. Scope control rules

Nếu chậm tiến độ, cắt theo thứ tự:

Cắt trước:

- report history.
- visual heuristics nâng cao.
- graph quá chi tiết.
- UI polish nhiều hiệu ứng.

Giữ lại bắt buộc:

- `lutest`.
- host/worker lifecycle.
- framework detection cơ bản.
- graph cơ bản.
- scan thật.
- latest report.
- screenshots.
- dashboard đọc data thật.

Cắt sau cùng:

- auth manual flow.
- cache diff.
- severity nâng cao.

### 5.17. Commit strategy

Khuyến nghị commit theo nhóm:

```txt
refactor(worker): centralize lutest storage paths
feat(project): expose source file count and framework summary
feat(graph): build initial project graph from source files
feat(scan): prepare playwright scan skeleton
feat(scan): add basic overflow and aabb checks
feat(ui): connect dashboard to real APIs
docs: add master srs context
```

Mỗi commit phải pass:

```bash
npm run typecheck
```

### 5.18. Current known technical notes

Tại thời điểm tạo tài liệu này:

- Project đã chuyển từ hướng cũ sang Node.js + Express worker.
- Runtime storage đã đổi sang `.lutest/`.
- `pathService` đã có nhiều path field quan trọng.
- `storageService` đã tồn tại.
- Graph contracts đã được đồng bộ lại để bỏ `generatedAt`, `data`, generic edge.
- `ScanResponse` có `status`.
- `scanMapper` dùng severity `"error"` để xác định failed.
- `npm run typecheck` đã pass sau khi sửa lỗi graph/scan contracts.
- `npm run lint` chạy không báo lỗi trong output hiện tại, nhưng cần kiểm tra package con có lint script thật hay không.

---

## 6. Acceptance Criteria Tổng Thể

### 6.1. Demo local core đạt yêu cầu khi

Command:

```bash
lutest
```

Kết quả:

1. CLI host start.
2. Worker process start.
3. Health check pass.
4. Dashboard URL được in ra.
5. `/api/status` trả OK.
6. `/api/project` trả project thật.
7. `/api/graph` trả graph thật.
8. Scan chạy được.
9. `.lutest/latest-report.json` được tạo.
10. `.lutest/reports/<scanId>.json` được tạo.
11. Screenshot được lưu nếu Playwright phase đã làm.
12. Dashboard đọc latest report thật.
13. Dashboard hiển thị bugs nếu có.
14. `npm run typecheck` pass.

### 6.2. Không được coi là hoàn thành nếu

- Dashboard vẫn dùng mock cho flow chính.
- Scan không ghi report local.
- Graph luôn empty dù project có source files.
- Worker dùng path sai khi chạy từ CLI host.
- CLI không cleanup worker khi shutdown.
- API response lệch contracts.
- Có placeholder code trong feature được đánh dấu hoàn thành.
- Typecheck fail.

---

## 7. Tài liệu nguồn liên quan

Roadmap chính:

```txt
docs/plan/rebuild-from-scratch.md
```

Contracts chính:

```txt
packages/contracts/src/index.ts
```

Worker app entry:

```txt
apps/worker-node/src/app.ts
```

Path service:

```txt
apps/worker-node/src/shared/services/path.service.ts
```

Storage service:

```txt
apps/worker-node/src/shared/services/storage.service.ts
```

Graph module:

```txt
apps/worker-node/src/modules/graph/
```

Project module:

```txt
apps/worker-node/src/modules/project/
```

Scan module:

```txt
apps/worker-node/src/modules/scan/
```

Report module:

```txt
apps/worker-node/src/modules/report/
```

---

## 8. Nguyên Tắc Sử Dụng Tài Liệu Này Cho AI Coding

Khi dùng AI để code tiếp Lutest, luôn đưa tài liệu này làm context chính.

AI phải tuân thủ:

1. Không tự đổi architecture.
2. Không tự đổi route names nếu chưa sửa toàn bộ docs/code.
3. Không thêm database server.
4. Không thêm cloud feature phase đầu.
5. Không viết placeholder.
6. Không tạo mock cho flow đã có API thật.
7. Không bỏ qua contracts.
8. Không hardcode path `.lutest`.
9. Không assume project target là repo Lutest.
10. Luôn chạy typecheck sau khi sửa code.
11. Nếu task thiếu thông tin, phải đọc code hiện tại trước khi sửa.
12. Nếu contract và implementation lệch nhau, sửa đồng bộ.
13. Nếu route và docs lệch nhau, báo rõ và chốt một chuẩn.