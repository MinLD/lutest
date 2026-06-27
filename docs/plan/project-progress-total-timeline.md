# PROJECT PROGRESS CONTEXT: TOTAL TIMELINE

Thời điểm cập nhật: 24/06/2026  
Vai trò tài liệu: tổng hợp tiến độ toàn dự án Lutest dựa trên source code thực tế trong monorepo hiện tại.

Nguồn đối chiếu chính:

- `apps/worker-node/src/modules/`
- `apps/worker-node/src/shared/`
- `packages/contracts/src/index.ts`
- `apps/ui/`
- `docs/plan/project-progress-week-1.md`

---

## 1. Công Việc ĐÃ HOÀN THÀNH (Done)

### Tuần 1 — Monorepo Foundation & Express Worker Migration

- [x] Thiết lập nền monorepo Lutest.
  - Repo hiện có cấu trúc workspace:
    - `apps/cli-host/`
    - `apps/worker-node/`
    - `apps/ui/`
    - `packages/contracts/`
    - `docs/plan/`
    - `docs/report/`
    - `scripts/`
  - File nền:
    - `package.json`
    - `package-lock.json`
    - `turbo.json`

- [x] Chuyển backend worker sang Node.js + Express.js.
  - Express app hiện được tạo trong:
    - `apps/worker-node/src/app.ts`
  - Middleware nền:
    - `express.json()`
    - `notFoundHandler`
    - `errorHandler`
  - Routes đã mount:
    - `GET /api/status`
    - `/api/project`
    - `/api/graph`
    - `/api/report`
    - `/api/scan`

- [x] Tạo module status.
  - Files:
    - `apps/worker-node/src/modules/status/status.controller.ts`
    - `apps/worker-node/src/modules/status/status.routes.ts`
  - Contract:
    - `StatusResponse`
  - Runtime contract:
    - `service: "lutest-worker"`
    - `runtime: "node"`

- [x] Tạo shared error middleware.
  - Files:
    - `apps/worker-node/src/shared/middleware/error-handler.ts`
    - `apps/worker-node/src/shared/middleware/not-found.ts`
  - Contract liên quan:
    - `ApiErrorResponse`

- [x] Tạo shared contracts package.
  - File:
    - `packages/contracts/src/index.ts`
  - Contracts hiện có:
    - `ApiErrorResponse`
    - `StatusResponse`
    - `DetectedFramework`
    - `ProjectSummary`
    - `GraphNodeType`
    - `GraphEdgeType`
    - `GraphNode`
    - `GraphEdge`
    - `GraphSummary`
    - `GraphResponse`
    - `ReportSummary`
    - `LatestReportResponse`
    - `ScanRequest`
    - `ScanIssue`
    - `ScanResponse`
    - `SourceFileNodeData`
    - `ImportEdgeData`

---

### Tuần 2 — Project Discovery, Local Storage, Scan Report Pipeline

- [x] Hoàn thiện project discovery v1.
  - File chính:
    - `apps/worker-node/src/modules/project/project.service.ts`
  - Chức năng đã có:
    - Resolve target root qua `pathService`.
    - Check `package.json`.
    - Đọc package metadata.
    - Detect framework từ dependencies/devDependencies.
    - Fallback detect Laravel/PHP qua:
      - `artisan`
      - `composer.json`
      - `index.php`
    - Liệt kê source files.
    - Đếm `sourceFileCount`.
  - Extensions đang scan:
    - `.ts`
    - `.tsx`
    - `.js`
    - `.jsx`
    - `.php`
  - Ignored dirs:
    - `node_modules`
    - `.git`
    - `dist`
    - `build`
    - `.next`
    - `.lutest`

- [x] Chuẩn hóa `ProjectSummary`.
  - Contract:
    - `packages/contracts/src/index.ts`
  - Fields:
    - `name`
    - `rootDir`
    - `lutestDir`
    - `packageJsonExists`
    - `detectedFramework`
    - `sourceFileCount`

- [x] Tạo path service cho runtime storage `.lutest`.
  - File:
    - `apps/worker-node/src/shared/services/path.service.ts`
  - Paths đã quản lý tập trung:
    - `targetProjectRoot`
    - `lutestDir`
    - `graphDir`
    - `screenshotsDir`
    - `authDir`
    - `reportDir`
    - `latestReportPath`
    - `latestGraphPath`
    - `hashPath`
    - `authStorageStatePath`
  - Runtime storage path:
    - `.lutest/latest-report.json`
    - `.lutest/graph/latest-graph.json`
    - `.lutest/screenshots/`
    - `.lutest/auth/storage-state.json`
    - `.lutest/hash.json`
    - `.lutest/reports/`

- [x] Tạo storage service dùng chung.
  - File:
    - `apps/worker-node/src/shared/services/storage.service.ts`
  - Chức năng:
    - `ensureDir`
    - `ensureProjectStorage`
    - `writeJson`
    - `readJson`
  - Mục tiêu:
    - Tập trung hóa JSON read/write.
    - Giảm hardcode `fs` trong repository layer.
    - Tự tạo folder cha trước khi ghi file.

- [x] Hoàn thiện scan report pipeline v1.
  - Files:
    - `apps/worker-node/src/modules/scan/scan.controller.ts`
    - `apps/worker-node/src/modules/scan/scan.routes.ts`
    - `apps/worker-node/src/modules/scan/scan.service.ts`
    - `apps/worker-node/src/modules/scan/scan.mapper.ts`
    - `apps/worker-node/src/modules/scan/scan.repository.ts`
  - Flow hiện tại:
    1. Tạo `scanId`.
    2. Resolve path bằng `pathService`.
    3. Discover project bằng `projectService.discoverProject`.
    4. Build + persist graph bằng `graphService.buildAndSaveGraph`.
    5. Run static rules bằng `ruleEngine.runRules`.
    6. Map response bằng `scanMapper.toScanResponse`.
    7. Ghi report vào `.lutest/reports/<scanId>.json`.
    8. Ghi latest report vào `.lutest/latest-report.json`.

- [x] Chuẩn hóa `ScanResponse`.
  - Contract:
    - `packages/contracts/src/index.ts`
  - Fields:
    - `scanId`
    - `startedAt`
    - `finishedAt`
    - `status`
    - `project`
    - `sourceFileCount`
    - `issues`
    - `reportPath`
  - Status:
    - `"passed"`
    - `"failed"`
    - `"warning"`

- [x] Tạo report module đọc latest report.
  - Files:
    - `apps/worker-node/src/modules/report/report.controller.ts`
    - `apps/worker-node/src/modules/report/report.routes.ts`
    - `apps/worker-node/src/modules/report/report.service.ts`
    - `apps/worker-node/src/modules/report/report.repository.ts`
  - Repository hiện đọc:
    - `paths.latestReportPath`
  - Dùng:
    - `pathService`
    - `storageService.readJson`

---

### Tuần 3 — Static Code Analysis Phase & Graph Extraction v1

- [x] Hoàn thành lõi rule engine cho static code analysis.
  - File:
    - `apps/worker-node/src/modules/rule/rule.engine.ts`
  - Chức năng:
    - Nhận `projectRoot` + danh sách `sourceFiles`.
    - Đọc source file.
    - Chuẩn hóa `relativePath`.
    - Tính `lineCount`.
    - Chạy nhiều rule theo interface `Rule`.
    - Trả về `ScanIssue[]`.
  - Rule list hiện được mount:
    - `noConsoleRule`
    - `todoCommentRule`
    - `largeFileRule`

- [x] Hoàn thành rule types.
  - File:
    - `apps/worker-node/src/modules/rule/rule.types.ts`
  - Vai trò:
    - Định nghĩa interface cho rule context/source file/rule runner.

- [x] Hoàn thành static rule: no-console.
  - File:
    - `apps/worker-node/src/modules/rule/rules/no-console.rule.ts`
  - Logic:
    - Detect `console.` trong source file.
    - Sinh issue:
      - `type: "console"`
      - `severity: "warning"`
      - `filePath: relativePath`

- [x] Hoàn thành static rule: todo-comment.
  - File:
    - `apps/worker-node/src/modules/rule/rules/todo-comment.rule.ts`
  - Logic:
    - Detect `/TODO|FIXME/i`.
    - Sinh issue:
      - `type: "unknown"`
      - `severity: "info"`
      - `filePath: relativePath`

- [x] Hoàn thành static rule: large-file.
  - File:
    - `apps/worker-node/src/modules/rule/rules/large-file.rule.ts`
  - Logic:
    - Threshold hiện tại: `MAX_LINES = 300`.
    - File vượt threshold sinh issue:
      - `type: "unknown"`
      - `severity: "warning"`
      - message chứa số dòng.

- [x] Tích hợp rule engine vào scan service.
  - File:
    - `apps/worker-node/src/modules/scan/scan.service.ts`
  - Code path:
    - `ruleEngine.runRules({ projectRoot, sourceFiles })`
  - Issues hiện tại được gộp:
    - base project issues
    - static rule issues

- [x] Hoàn thành Graph Extraction v1.
  - File:
    - `apps/worker-node/src/modules/graph/graph.service.ts`
  - Hàm chính:
    - `buildGraph`
    - `toNode`
  - Logic hiện tại:
    - List source files từ target root.
    - Convert từng file thành `GraphNode`.
    - Đọc nội dung source để parse import edges cơ bản.
    - Tự phân loại node type bằng heuristic/path convention.
  - Node type detection v1 hiện tại:
    - `page`: `app/**/page.*`, `pages/**` trừ `pages/api/**`, hoặc `routes/**`.
    - `component`: file `.tsx/.jsx` trong `components/**` hoặc `ui/**`, hoặc PascalCase component file.
    - `api`: `app/**/route.*`, `pages/api/**`, hoặc path có segment `api/server/services`.
    - fallback: `file`
  - API detection semantic v1:
    - File:
      - `apps/worker-node/src/modules/graph/api-call-detector.ts`
      - `apps/worker-node/src/modules/graph/api-call-detector.test.ts`
    - Detect network call trong source:
      - `fetch("...")`
      - `ofetch("...")`
      - `axios.get/post/put/patch/delete/head/options("...")`
      - `ky.get/post/put/patch/delete/head/options("...")`
    - Gắn `apiCalls` vào `GraphNode.data`.
    - Nếu node đang là `file` và có API call thì nâng type thành `api`.
  - Giới hạn còn lại:
    - Chưa trace custom client/import chain sâu.
    - Chưa dùng AST parser để phân biệt toàn bộ false positive/false negative nâng cao.
    - V2 sâu hơn sẽ làm khi cần đọc custom client như `api.get`, `http.post`, `client.request`.
  - Graph summary đã tính:
    - `pageCount`
    - `componentCount`
    - `apiCount`
    - `fileCount`
  - Status:
    - Graph Extraction v1: DONE.
    - Import edge extraction v1: DONE cho relative imports/requires cơ bản.
    - API semantic detection v1: DONE cho `fetch`, `ofetch`, `axios`, `ky`.

- [x] Chuẩn hóa Graph contracts.
  - File:
    - `packages/contracts/src/index.ts`
  - Graph contracts:
    - `GraphNodeType = "page" | "component" | "api" | "file"`
    - `GraphEdgeType = "import" | "use" | "call"`
    - `GraphNode`
    - `GraphEdge`
    - `GraphSummary`
    - `GraphResponse`

- [x] Hoàn thiện graph repository dùng centralized storage.
  - File:
    - `apps/worker-node/src/modules/graph/graph.repository.ts`
  - Chức năng:
    - `saveLatest`
    - `findLatest`
  - Storage:
    - `.lutest/graph/latest-graph.json`
  - Dùng:
    - `pathService.resolveProjectPaths`
    - `storageService.writeJson`
    - `storageService.readJson`

- [x] Hoàn thiện graph API module v1.
  - Files:
    - `apps/worker-node/src/modules/graph/graph.controller.ts`
    - `apps/worker-node/src/modules/graph/graph.mapper.ts`
    - `apps/worker-node/src/modules/graph/graph.repository.ts`
    - `apps/worker-node/src/modules/graph/graph.routes.ts`
    - `apps/worker-node/src/modules/graph/graph.service.ts`

---

## 2. Công Việc CÒN DANG DỞ / CHƯA LÀM (Todo & Pending)

### Tuần 3 còn dang dở

- [x] Graph import edge extraction v1 đã hoàn thiện ở mức cơ bản.
  - `graph.service.ts` hiện parse:
    - `import ... from "..."`
    - side-effect import
    - `require("...")`
  - Resolve:
    - relative imports.
    - extension candidates: `.ts`, `.tsx`, `.js`, `.jsx`.
    - `index.*`.
  - Tạo `GraphEdge` type `"import"` source -> target.

- [x] Graph repository đã được gọi khi build graph.
  - `graphService.buildAndSaveGraph` build graph rồi gọi `graphRepository.saveLatest`.
  - `GET /api/graph` dùng `buildAndSaveGraph`.
  - `scan.service.ts` cũng dùng `buildAndSaveGraph`.
  - Graph snapshot được ghi vào `.lutest/graph/latest-graph.json`.

- [x] `scanRepository.getLatestReport` đã refactor.
  - Dùng:
    - `pathService.resolveProjectPaths`
    - `storageService.readJson`
    - `paths.latestReportPath`
  - Không còn đọc nhầm/latest hardcode legacy path.

- [x] Dọn legacy imports chính.
  - `report.repository.ts` đã dùng centralized storage.
  - `scan.repository.ts` đã bỏ legacy read path.
  - Đã chạy build/typecheck pass.

- [x] API detection semantic v1 trong graph đã hoàn thành.
  - File:
    - `apps/worker-node/src/modules/graph/api-call-detector.ts`
    - `apps/worker-node/src/modules/graph/api-call-detector.test.ts`
    - `apps/worker-node/src/modules/graph/graph.service.ts`
    - `packages/contracts/src/index.ts`
  - Detect:
    - `fetch`
    - `ofetch`
    - `axios`
    - `ky`
  - Output:
    - `GraphNode.data.apiCalls`
    - `kind`
    - `target`
    - `method`
    - `line`
  - `graph.service.ts` đã gắn API calls vào node.
  - Node type `file` có API call được nâng thành `api`.
  - Đã chạy:
    - `npm run typecheck`
    - `npm run build`
  - Giới hạn để làm sau:
    - custom client/import chain sâu.
    - AST parser để giảm false positive/false negative.
    - call edges semantic giữa page/component và API layer.

---

### Tuần 4 — Dashboard UI/UX & Graph Visualization Pending

- [ ] Scaffold dashboard UI bằng Next.js.
  - App path:
    - `apps/ui/`
  - Stack bắt buộc:
    - Next.js `16.3`
    - TypeScript
    - Tailwind CSS
  - Không dùng Vite cho dashboard UI.
  - Mục tiêu tuần 4:
    - dựng khung dashboard trước
    - chưa làm Playwright
    - chưa làm visual automation

- [ ] Chuẩn hóa cấu trúc Next.js app router cho dashboard.
  - Cần có tối thiểu:
    - `apps/ui/package.json`
    - `apps/ui/next.config.ts`
    - `apps/ui/tsconfig.json`
    - `apps/ui/postcss.config.mjs`
    - `apps/ui/src/app/layout.tsx`
    - `apps/ui/src/app/page.tsx`
    - `apps/ui/src/app/globals.css`
  - UI code viết bằng React + TypeScript.
  - Styling dùng Tailwind CSS, tránh CSS inline/hardcode rải rác.

- [ ] Dashboard local chưa đọc API thật.
  - API cần gọi:
    - `GET /api/status`
    - `GET /api/project`
    - `GET /api/graph`
    - `GET /api/report`
    - `POST /api/scan`
  - Cần có fetch client typed theo `packages/contracts`.

- [ ] Graph visualization UI chưa có.
  - Cần render nodes:
    - `page`
    - `component`
    - `api`
    - `file`
  - Cần display summary:
    - page count
    - component count
    - api count
    - total file count

- [ ] Hệ thống bảng màu OKLCH cho các nút đồ thị chưa làm.
  - Cần thiết kế token màu cho:
    - `page`
    - `component`
    - `api`
    - `file`
    - warning/error states
  - Cần tránh màu hardcode rải rác trong component.

- [ ] Thuật toán va chạm hình học AABB cho graph layout chưa làm.
  - Cần dùng cho:
    - detect overlap node
    - tránh node collision
    - layout readable
  - Thuộc UI/UX Dashboard phase.

- [ ] Dashboard states chưa làm.
  - Cần có:
    - loading state
    - error state
    - empty state
    - stale report state
    - scan running state

---

### Tuần 4–5 — Playwright Browser Automation & Visual Check Pending

- [ ] Playwright browser automation chưa tích hợp.
  - Chưa thấy module browser/visual trong:
    - `apps/worker-node/src/modules/`
  - Cần làm:
    - launch browser
    - navigate target URL
    - collect console errors
    - collect page errors
    - close browser an toàn

- [ ] Visual check chưa làm.
  - Cần thêm check:
    - overflow
    - element overlap
    - clipping
    - viewport rendering anomalies
  - Contract hiện có `ScanIssue.type` gồm:
    - `"console"`
    - `"syntax"`
    - `"overflow"`
    - `"unknown"`
  - Có thể cần mở rộng issue types sau.

- [ ] Chụp ảnh viewport chưa làm.
  - Storage folder đã có:
    - `.lutest/screenshots/`
  - Nhưng chưa thấy flow ghi screenshot trong scan service.
  - Cần thêm fields vào report nếu screenshot là output chính.

- [ ] DOM bounding boxes chưa làm.
  - Cần collect:
    - selector
    - text/name
    - bounding box
    - visibility
    - computed style nếu cần contrast/overflow.
  - Dữ liệu này sẽ phục vụ AABB/visual checks.

- [ ] Auth/manual browser flow chưa làm.
  - Storage path đã có:
    - `.lutest/auth/storage-state.json`
  - Nhưng module auth chưa tồn tại.
  - Endpoints dự kiến:
    - `POST /api/actions/auth/start`
    - `POST /api/actions/auth/clear`
    - `GET /api/auth/status`

---

### Tuần 5+ — CLI Host, Cache, Production Hardening, NPM Publish Pending

- [ ] CLI host lifecycle chưa được xác minh đầy đủ.
  - Cần audit:
    - `apps/cli-host/`
  - Cần có:
    - parse flags
    - load config
    - spawn worker-node
    - health check
    - shutdown
    - port conflict handling
    - open dashboard

- [ ] Config module mới có `config/`.
  - File:
    - `apps/worker-node/src/modules/config/config.service.ts`
  - Cần kiểm tra hoàn thiện merge config:
    1. defaults
    2. `.env`
    3. `lutest.yaml`
    4. env vars
    5. CLI flags

- [ ] Cache diff chưa làm.
  - Storage path đã có:
    - `.lutest/hash.json`
  - Module cache chưa thấy trong:
    - `apps/worker-node/src/modules/`
  - Cần làm:
    - hash source files
    - compare previous scan
    - skip unchanged work nếu hợp lệ
    - expose cache status API nếu cần.

- [ ] Report validation chưa hoàn chỉnh.
  - Cần xử lý:
    - missing latest report
    - malformed JSON
    - schema mismatch
    - stale report
  - Files liên quan:
    - `apps/worker-node/src/modules/report/report.repository.ts`
    - `apps/worker-node/src/modules/report/report.service.ts`
    - `packages/contracts/src/index.ts`

- [ ] Automated tests chưa được xác nhận.
  - Cần test:
    - `pathService.resolveProjectPaths`
    - `storageService.readJson/writeJson`
    - `projectService.discoverProject`
    - `graphService.buildGraph`
    - `ruleEngine.runRules`
    - `scanMapper.toScanResponse`
    - report missing file behavior.

- [ ] NPM publish chưa được thực hiện.
  - Không publish ngay sau Tuần 3 dù scan/graph v1 đã chạy được.
  - Điều kiện publish bản đầu tiên (`0.1.0-alpha` hoặc `0.1.0`) là:
    1. CLI có command product-grade:
       - `lutest scan <projectPath>`
    2. CLI tự quản lý worker lifecycle:
       - cấp port
       - spawn worker
       - wait `/api/status`
       - gọi `POST /api/scan`
       - in kết quả scan
       - shutdown worker an toàn
       - trả exit code đúng (`0` khi passed, `1` khi failed/error)
    3. Chốt package publish:
       - ưu tiên publish CLI package public dưới tên `@lutest/cli`
       - không publish root monorepo
       - không publish worker/contracts riêng nếu chưa cần public API
    4. Chuẩn hóa package metadata:
       - `name`
       - `version`
       - `bin`
       - `files`
       - `main`
       - README usage tối thiểu
    5. Build/typecheck pass:
       - `npm run typecheck`
       - `npm run build`
    6. Test bằng fixture lớn:
       - `fixtures/next-graph-243`
       - scan status `passed`
       - graph/report được ghi vào `.lutest/`
    7. Test package local:
       - `npm pack`
       - `npm install -g <tarball>`
       - `lutest scan <fixturePath>`
    8. Dry-run publish:
       - `npm publish --dry-run --access public`
       - kiểm tra tarball không chứa `fixtures/`, `node_modules/`, `.lutest/`, file dev thừa
    9. Publish thật:
       - `npm publish --access public`
    10. Test sau publish:
        - `npm install -g @lutest/cli`
        - `lutest scan <fixturePath>`
  - Mốc đề xuất:
    - Sau khi hoàn tất phần CLI host lifecycle ở Tuần 5+.
    - Nếu cần phát hành sớm để test nội bộ, publish `0.1.0-alpha.0` sau khi `lutest scan <projectPath>` chạy ổn qua npm pack.

---

## 3. Các Điểm Cần Cập Nhật / Tối Ưu Trong Tương Lai (Technical Debt & Future Updates)

- [ ] Refactor `rule.engine.ts` để hạn chế đọc file bằng `fs` trực tiếp.
  - Hiện rule engine vẫn dùng:
    - `fs.readFile`
  - Không sai về chức năng, nhưng nếu muốn triệt để hóa storage abstraction thì nên chuyển qua shared file reader.
  - File:
    - `apps/worker-node/src/modules/rule/rule.engine.ts`

- [ ] Refactor `project.service.ts` để giảm `fs` trực tiếp.
  - Hiện vẫn dùng:
    - `fs.access`
    - `fs.readFile`
  - Có thể giữ nếu đây là discovery low-level, nhưng nên thống nhất với `fileSystemService` hoặc repository layer.
  - File:
    - `apps/worker-node/src/modules/project/project.service.ts`

- [x] Refactor `scan.repository.ts`.
  - `saveReport` dùng:
    - `storageService.writeJson(input.report.reportPath, input.report)`
    - `storageService.writeJson(paths.latestReportPath, input.report)`
  - `getLatestReport` đã đổi sang:
    - `storageService.readJson<ScanResponse>(paths.latestReportPath)`

- [x] Dọn unused imports chính.
  - `report.repository.ts` không còn legacy `path/fileSystemService`.
  - `scan.repository.ts` không còn legacy read path.
  - Build/typecheck đã pass.

- [x] Hoàn thiện graph persistence flow.
  - `graphService.buildAndSaveGraph` gọi `graphRepository.saveLatest`.
  - Route graph và scan flow đã dùng build-and-save.
  - Graph build cập nhật:
    - `.lutest/graph/latest-graph.json`

- [x] Hoàn thiện graph import edges v1.
  - Node extraction đã xong.
  - Edge extraction import/require cơ bản đã có.
  - Cần parse call/use nâng cao sau.

- [ ] Hoàn thiện API semantic detection v2.
  - V1 hiện vẫn heuristic/path-based.
  - Cần detect network behavior trong nội dung file bằng AST.
  - Cần support custom API clients và trace import chain.

- [ ] Mở rộng `ScanIssue.type`.
  - Hiện type còn hẹp:
    - `"console"`
    - `"syntax"`
    - `"overflow"`
    - `"unknown"`
  - Static rules như `todo-comment`, `large-file` đang dùng `"unknown"`.
  - Nên thêm:
    - `"todo"`
    - `"maintainability"`
    - `"large-file"`
    - `"visual"`
    - `"accessibility"` nếu SRS cho phép.

- [ ] Chuẩn hóa route naming scan.
  - Code hiện mount:
    - `app.use("/api/scan", scanRoutes)`
  - Một số roadmap/SRS trước có thể nhắc:
    - `/api/actions/scan`
  - Cần chốt 1 chuẩn trước khi UI gọi API.

- [ ] Thêm API validation layer.
  - Cần validate:
    - request body `ScanRequest`
    - `projectPath`
    - query params
  - Không trust raw user input.

- [ ] Bổ sung security guard cho path traversal.
  - `projectPath` hiện resolve bằng `path.resolve`.
  - Cần policy rõ:
    - cho phép scan bất kỳ local folder?
    - hay chỉ trong workspace?
  - Nếu expose qua dashboard local, vẫn cần validate.

- [ ] Bổ sung report schema validation.
  - `storageService.readJson` hiện catch mọi lỗi và trả `null`.
  - Cần phân biệt:
    - file missing
    - invalid JSON
    - schema invalid
    - permission error
  - Có thể bổ sung result type thay vì null-only.

- [ ] Tối ưu source discovery performance.
  - Cần giới hạn:
    - max file count
    - max file size
    - ignored binary/static dirs
  - Tránh đọc file quá lớn trong rule engine.

- [ ] Đồng bộ docs.
  - File tuần cũ:
    - `docs/plan/project-progress-week-1.md`
  - File tổng mới:
    - `docs/plan/project-progress-total-timeline.md`
  - Nên quyết định file nào là canonical progress context.

---

## 4. Trạng Thái Hiện Tại của Hệ Thống (Current System State)

### Tổng quan monorepo

- Project: Lutest
- Runtime backend: Node.js
- Backend framework: Express.js
- Language chính: TypeScript
- Monorepo package manager: npm workspaces
- Workspace/app chính:
  - `apps/worker-node/` — backend worker Express
  - `apps/cli-host/` — CLI host, cần audit thêm
  - `apps/ui/` — dashboard placeholder, hiện chưa có file
  - `packages/contracts/` — shared contracts
  - `docs/plan/` — planning/progress docs

### Worker Express app

- File:
  - `apps/worker-node/src/app.ts`
- Mounted routes:
  - `/api/status`
  - `/api/project`
  - `/api/graph`
  - `/api/report`
  - `/api/scan`
- Middleware:
  - `express.json()`
  - `notFoundHandler`
  - `errorHandler`

### Modules hiện có trong worker

- `config/`
  - `config.service.ts`
- `status/`
  - `status.controller.ts`
  - `status.routes.ts`
- `project/`
  - `project.controller.ts`
  - `project.mapper.ts`
  - `project.repository.ts`
  - `project.routes.ts`
  - `project.service.ts`
- `graph/`
  - `graph.controller.ts`
  - `graph.mapper.ts`
  - `graph.repository.ts`
  - `graph.routes.ts`
  - `graph.service.ts`
- `rule/`
  - `rule.engine.ts`
  - `rule.types.ts`
  - `rules/no-console.rule.ts`
  - `rules/todo-comment.rule.ts`
  - `rules/large-file.rule.ts`
- `scan/`
  - `scan.controller.ts`
  - `scan.mapper.ts`
  - `scan.repository.ts`
  - `scan.routes.ts`
  - `scan.service.ts`
- `report/`
  - `report.controller.ts`
  - `report.repository.ts`
  - `report.routes.ts`
  - `report.service.ts`

### Contracts hiện tại

- File:
  - `packages/contracts/src/index.ts`
- Key contracts:
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

### Static analysis hiện tại

- Status: DONE v1.
- Entry:
  - `ruleEngine.runRules`
- Rules:
  - `no-console`
  - `todo-comment`
  - `large-file`
- Integration:
  - `scan.service.ts` gọi `ruleEngine.runRules`.
- Output:
  - `ScanIssue[]`, gộp vào `ScanResponse.issues`.

### Graph extraction hiện tại

- Status: DONE v1 cho nodes + summary + import edges cơ bản.
- Entry:
  - `graphService.buildGraph`
  - `graphService.buildAndSaveGraph`
- Node classifier:
  - `toNode`
- Type detection:
  - `page`
  - `component`
  - `api`
  - `file`
- Edge extraction:
  - đã có import/require edges cơ bản.
  - resolve relative imports + extension/index candidates.
- Giới hạn hiện tại:
  - API detection còn heuristic/path-based.
  - Chưa có AST semantic detection.
  - Chưa trace page -> component -> hook/service -> API call ở mức hành vi.

### Storage hiện tại

- Runtime folder:
  - `.lutest/`
- Central path service:
  - `apps/worker-node/src/shared/services/path.service.ts`
- Central JSON storage:
  - `apps/worker-node/src/shared/services/storage.service.ts`
- Report write:
  - `.lutest/reports/<scanId>.json`
  - `.lutest/latest-report.json`
- Graph latest path:
  - `.lutest/graph/latest-graph.json`
- Screenshots path ready:
  - `.lutest/screenshots/`
- Auth path ready:
  - `.lutest/auth/storage-state.json`
- Cache hash path ready:
  - `.lutest/hash.json`

### UI/dashboard hiện tại

- `apps/ui/` dùng cho dashboard Next.js.
- Dashboard cần scaffold theo Next.js 16.3 + TypeScript + Tailwind CSS.
- Không dùng Vite cho dashboard UI.
- Chưa có:
  - Next.js app router structure hoàn chỉnh
  - Tailwind CSS setup
  - graph visualization
  - OKLCH color tokens
  - AABB layout/collision
  - API client
  - report viewer
  - scan trigger UI
  - loading/error/empty states

### Playwright/visual automation hiện tại

- Chưa thấy module Playwright/browser/visual.
- Chưa có:
  - viewport screenshot capture
  - DOM bounding boxes
  - visual overflow checks
  - AABB visual collision checks
  - browser console/page error collection
  - auth storage-state flow

### Đánh giá tổng thể theo timeline

- Tuần 1: DONE — monorepo + Express worker + contracts nền.
- Tuần 2: DONE — project discovery + path/storage service + scan/report pipeline v1.
- Tuần 3: DONE — static code analysis + graph extraction v1 + import edges v1 + graph persistence + API semantic detection v1.
- Tuần 3 còn lại: API semantic detection v2, unit tests graph builder, endpoint naming cleanup.
- Tuần 4: TODO — scaffold dashboard UI bằng Next.js 16.3 + TypeScript + Tailwind CSS, sau đó làm graph visualization + OKLCH + AABB.
- Tuần 5: TODO — Playwright visual automation + screenshots + DOM bounding boxes + auth/cache hardening.
- Tuần 5+: TODO — CLI product command `lutest scan <projectPath>` + npm publish readiness.
- Publish npm: chưa publish; chỉ publish sau khi CLI lifecycle + npm pack + dry-run pass.

### File progress mới

- Canonical generated file:
  - `docs/plan/project-progress-total-timeline.md`
- File cũ cần cân nhắc thay thế hoặc archive:
  - `docs/plan/project-progress-week-1.md`
