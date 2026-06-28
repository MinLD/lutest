# Lutest Zero-Debt Technical Audit & Production-Grade Roadmap

Cập nhật: 28/06/2026  
Vai trò: tài liệu kiểm soát nợ kỹ thuật bắt buộc trước khi mở rộng tính năng mới.  
Nguyên tắc: tính năng đã đánh dấu `Done` nhưng còn mock/placeholder/heuristic/hardcode thì bị hạ xuống `Done v1 - cần hardening`, không được coi là production-grade.

---

## 1. Technical Debt Audit

### 1.1 Graph Extraction

Trạng thái hiện tại: `Done v1`, chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/modules/graph/graph.service.ts`
  - Phân loại node type bằng path convention/heuristic:
    - `app/**/page.*`
    - `pages/**`
    - `components/**`
    - PascalCase file name
    - path segment `api/server/services`
  - `componentCount` hiện đếm theo file node, không đếm function/class component trong file.
  - `apiCount` hiện đếm theo file có API call, không đếm từng API method/endpoint/client method.
  - Import edge extraction còn regex/basic parser.
  - Chưa có AST symbol graph.
  - Chưa trace call/use edges:
    - page -> component
    - component -> hook
    - hook/service -> API client
    - API client -> fetch/axios target

- `apps/worker-node/src/modules/graph/api-call-detector.ts`
  - Có semantic detection v1 cho `fetch`, `ofetch`, `axios`, `ky`.
  - Chưa trace custom client/import chain sâu.
  - Chưa parse AST đủ để giảm false positive/false negative.
  - Chưa resolve template literal/dynamic endpoint production-grade.

Production gap so với SRS:

- SRS yêu cầu graph có ý nghĩa kiến trúc, không chỉ file inventory.
- Graph phải trả lời được “component nào gọi API nào”, không chỉ “file nào có fetch”.

Ưu tiên: P0.

---

### 1.2 API Validation & Input Trust Boundary

Trạng thái hiện tại: chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/modules/scan/scan.controller.ts`
  - Nhận `ScanRequest` từ `req.body`, chưa runtime-validate schema.
- `apps/worker-node/src/modules/project/project.controller.ts`
  - Nhận `path` query/env fallback, chưa runtime-validate đầy đủ.
- `apps/worker-node/src/modules/graph/graph.controller.ts`
  - Nhận `path` query/env fallback, chưa runtime-validate đầy đủ.
- `apps/worker-node/src/modules/report/report.controller.ts`
  - Nhận `path` query/env fallback, chưa runtime-validate đầy đủ.
- `packages/contracts/src/index.ts`
  - Chỉ có TypeScript types.
  - Chưa có runtime schema validation.

Production gap so với SRS:

- TypeScript compile-time types không bảo vệ API runtime.
- Local dashboard vẫn là trust boundary vì input đến từ HTTP.

Ưu tiên: P0.

Required fix:

- Thêm validation layer không thêm dependency nếu chưa cần:
  - validate string/non-empty
  - validate object shape
  - reject unknown dangerous input
  - return `400 INVALID_REQUEST`
- Nếu schema phức tạp hơn: cân nhắc zod chỉ khi project đã có hoặc validation tự viết trở nên lớn.

---

### 1.3 Path Security & Filesystem Policy

Trạng thái hiện tại: chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/shared/services/path.service.ts`
  - Dùng `path.resolve(rawRoot)`.
  - Chưa có policy rõ:
    - cho phép scan mọi local folder?
    - chỉ workspace?
    - chỉ folder user chọn qua CLI?
  - Chưa chặn path traversal theo policy.
  - Chưa validate root tồn tại/là directory ở boundary.

- `apps/ui/.env`
  - Có `NEXT_PUBLIC_LUTEST_PROJECT_PATH`.
  - Đây là config local, chấp nhận được cho dev, nhưng không được hardcode trong production flow.

Production gap so với SRS:

- Scanner đụng filesystem local; phải có policy rõ và lỗi rõ.
- Không được silently scan nhầm folder.

Ưu tiên: P0.

---

### 1.4 Report Storage & Schema Integrity

Trạng thái hiện tại: `Done v1`, chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/shared/services/storage.service.ts`
  - `readJson` trả `null` cho nhiều lỗi.
  - Chưa phân biệt:
    - file missing
    - invalid JSON
    - schema invalid
    - permission denied
- `apps/worker-node/src/modules/report/report.repository.ts`
  - Đọc latest report nhưng chưa runtime-validate schema.
- `apps/worker-node/src/modules/report/report.service.ts`
  - Chưa phân biệt stale/malformed/missing rõ trong response.

Production gap so với SRS:

- Report là dữ liệu cốt lõi. Không được trust JSON cũ trong `.lutest`.
- UI phải biết `missing`, `stale`, `invalid`, không chỉ `null`.

Ưu tiên: P0.

---

### 1.5 Static Rule Engine

Trạng thái hiện tại: `Done v1`, chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/modules/rule/rule.engine.ts`
  - Đọc file trực tiếp.
  - Chưa có file size guard.
  - Chưa skip binary/minified/generated files theo policy đủ chặt.
  - Chưa có timeout/budget cho scan lớn.
- `apps/worker-node/src/modules/rule/rules/large-file.rule.ts`
  - `MAX_LINES = 300` hardcode.
  - Chưa lấy từ config.
- `apps/worker-node/src/modules/rule/rules/todo-comment.rule.ts`
  - Regex `/TODO|FIXME/i` đơn giản.
  - Rule type trước đây từng dùng `"unknown"`; contract hiện đã có `"todo"`, cần đảm bảo implementation đồng bộ.
- `apps/worker-node/src/modules/scan/scan.service.ts`
  - Missing package issue từng dùng `"unknown"`; cần type cụ thể nếu SRS yêu cầu.

Production gap so với SRS:

- Rule engine phải predictable, bounded, configurable.
- Issues phải typed rõ để UI/report filter được.

Ưu tiên: P1.

---

### 1.6 UI Dashboard

Trạng thái hiện tại: functional local dashboard, chưa đạt production-grade.

Nợ kỹ thuật hiện có:

- `apps/ui/src/lib/api-client.ts`
  - `DEFAULT_WORKER_URL = "http://localhost:6532"` hardcode fallback.
  - Endpoint string hardcode trực tiếp.
  - Error response body chưa được parse để hiện message chuẩn.
- `apps/ui/src/lib/use-dashboard-data.ts`
  - `NEXT_PUBLIC_LUTEST_PROJECT_PATH` là dev convenience.
  - Chưa có UI chọn project path an toàn.
- `apps/ui/src/components/dashboard-shell.tsx`
  - File lớn > 300 lines.
  - Nhiều component nội bộ trong 1 file.
  - Dễ làm graph hiện tại hiểu sai vì scanner đang file-level.
  - Cần tách component theo domain nếu dashboard tiếp tục lớn.
- `apps/worker-node/src/app.ts`
  - CORS hardcode `http://localhost:3000`.
  - Chưa đọc allowed origin từ config.

Production gap so với SRS:

- Dashboard phải dùng typed API client, trạng thái lỗi rõ, không hardcode local-only config rải rác.
- UI graph hiện chưa symbol-level; hiển thị số liệu bị hiểu nhầm nếu không ghi rõ.

Ưu tiên: P1.

---

### 1.7 CLI Host Lifecycle

Trạng thái hiện tại: cần audit sâu trước publish.

Nợ kỹ thuật hiện có:

- `apps/cli-host/src/main.ts`
  - Dùng `localhost` direct.
  - `WORKER_TIMEOUT` fallback hardcode `30000`.
  - retry/delay hardcode.
  - Cần xác minh:
    - port conflict handling
    - worker shutdown
    - exit code
    - stdout/stderr UX
    - npm pack behavior

Production gap so với SRS:

- CLI là product entrypoint; không được publish nếu lifecycle chưa deterministic.

Ưu tiên: P1 trước npm publish.

---

### 1.8 Config System

Trạng thái hiện tại: partial.

Nợ kỹ thuật hiện có:

- `apps/worker-node/src/modules/config/config.service.ts`
  - Có fallback env/default.
  - Chưa xác nhận merge order đầy đủ:
    1. defaults
    2. `.env`
    3. `lutest.yaml`
    4. env vars
    5. CLI flags
  - Chưa có validation cho config final.
  - Chưa có docs config.

Production gap so với SRS:

- Không module nào được tự đọc env/path hardcode nếu đã có config layer.

Ưu tiên: P1.

---

## 2. Ưu Tiên Refactor Trước Tính Năng Mới

### P0 — Blocker, phải làm ngay

1. Runtime API validation.
2. Path security policy.
3. Report schema validation.
4. Graph symbol-level AST parser:
   - component declarations
   - API method declarations
   - import/call/use edges
5. Contract/schema alignment:
   - TypeScript contract
   - runtime validation
   - response shape
   - test fixtures

Không làm tính năng mới trước khi P0 pass.

### P1 — Production hardening

1. Rule engine file budget/configurable thresholds.
2. CORS/config cleanup.
3. UI API error handling.
4. Dashboard component split.
5. CLI lifecycle hardening.
6. Config merge order + docs.
7. Test coverage cho modules Done.

### P2 — Feature expansion

Chỉ mở sau P0/P1:

1. Playwright browser automation.
2. Screenshot capture.
3. DOM bounding boxes.
4. AABB visual checks.
5. Auth storage-state flow.
6. Cache diff.
7. NPM publish.

---

## 3. Strict Definition of Done theo Module

### 3.1 Contracts Package

DoD:

- TypeScript exports đầy đủ.
- Runtime schema hoặc validator tương ứng cho mọi API request/response.
- Không field `"unknown"` nếu có type cụ thể hơn.
- Backward compatibility được ghi trong docs.
- Unit tests cho valid/invalid payload.
- `npm run build -w @lutest/contracts` pass.
- `npm run typecheck` pass.
- Document contract change trong `docs/plan/`.

### 3.2 Worker App / Middleware

DoD:

- Không hardcode CORS origin; đọc từ config.
- JSON body limit có cấu hình.
- Error handler trả mã lỗi ổn định:
  - `INVALID_REQUEST`
  - `NOT_FOUND`
  - `INTERNAL_ERROR`
  - `SCHEMA_INVALID`
  - `PATH_NOT_ALLOWED`
- Không leak stack trace ngoài development.
- Request validation chạy trước service.
- Unit/integration tests cho 404/error/preflight.
- Document route table.

### 3.3 Project Discovery

DoD:

- Validate `projectPath`.
- Check path tồn tại và là directory.
- Respect path policy.
- Ignore dirs/files có test.
- Có max file count/max file size guard.
- Framework detection có fixture tests:
  - Next
  - Vite React
  - React
  - Vue
  - Laravel/PHP
  - unknown
- Không scan `.lutest`, `node_modules`, `.next`, build artifacts.
- Document discovery rules.

### 3.4 Graph Extraction

DoD:

- AST parser dùng cho `.ts`, `.tsx`, `.js`, `.jsx`.
- Component count dựa trên declarations, không chỉ file.
- API count dựa trên API call/method symbols, không chỉ file.
- Import edges resolve relative/index/extensions.
- Call/use edges có fixture tests.
- Custom API client trace tối thiểu:
  - imported client
  - wrapper function
  - hook -> client call
- Summary có định nghĩa rõ:
  - file count
  - component count
  - api count
  - page count
- False positive/false negative có fixture regression.
- Không heuristic-only cho module đã đánh dấu Done.
- Document graph semantics.

### 3.5 Rule Engine

DoD:

- Rule input không tự do đọc file không qua bounded reader.
- Có max file size.
- Có skip binary/generated/minified policy.
- Threshold lấy từ config.
- Mỗi rule có test riêng.
- Issue type cụ thể, không dùng `"unknown"` nếu có option đúng.
- Rule engine không crash toàn scan vì 1 file lỗi.
- Document rule catalog.

### 3.6 Scan Pipeline

DoD:

- Request validated.
- Project discovery errors map thành typed issue/error.
- Graph build errors không làm mất report nếu partial report được SRS cho phép.
- Report write atomic hoặc có failure handling rõ.
- `scanId` unique deterministic enough.
- `startedAt/finishedAt` ISO string.
- Exit/status logic có test:
  - passed
  - warning
  - failed
- Integration test scan fixture.
- Document scan lifecycle.

### 3.7 Report Module

DoD:

- Latest report missing trả response rõ.
- Invalid JSON trả error rõ, không nuốt lỗi thành `null`.
- Schema invalid bị reject.
- Stale report detection nếu project changed.
- Report path không expose nguy hiểm nếu SRS không cho.
- Tests cho:
  - missing
  - malformed
  - schema mismatch
  - valid report
- Document report format.

### 3.8 UI Dashboard

DoD:

- Không mock data ở màn chính.
- API client typed bằng contracts.
- Error body parsed và hiển thị rõ.
- Loading/error/empty/stale/scanning states đủ.
- No hardcoded worker URL outside config fallback documented.
- No hardcoded project path trong source.
- Accessibility basic:
  - keyboard usable
  - semantic buttons
  - visible focus
- Large component split khi vượt 300 lines hoặc nhiều domain.
- Build pass.
- UI docs cập nhật.

### 3.9 CLI Host

DoD:

- `lutest scan <projectPath>` chạy end-to-end.
- Validate args.
- Spawn worker bằng port available.
- Wait health check với timeout configurable.
- Shutdown worker an toàn.
- Exit code:
  - `0` passed
  - `1` failed/error
  - optional `2` invalid input
- Logs clean.
- `npm pack` test pass.
- Dry-run publish pass trước publish thật.
- README usage tối thiểu.

### 3.10 Config Module

DoD:

- Merge order cố định:
  1. defaults
  2. config file
  3. env vars
  4. CLI flags
- Validate final config.
- Không module nào tự parse env nếu config service cung cấp value.
- Config docs có example.
- Tests cho precedence.

---

## 4. Zero-Debt Roadmap

### Phase Z0 — Freeze & Reclassify Done

- [ ] Đổi nhãn `Done` thành:
  - `Done v1`
  - `Production Done`
- [ ] Hạ các mục sau từ `Done` xuống `Done v1 - hardening required`:
  - Graph Extraction v1
  - API semantic detection v1
  - Static rule engine v1
  - Report pipeline v1
  - Dashboard UI local integration
- [ ] Chỉ tính `Production Done` khi DoD module pass.

### Phase Z1 — P0 Hardening

- [ ] Thêm runtime validators cho request/response contracts.
- [ ] Thêm path security policy.
- [ ] Refactor report read thành result type:
  - missing
  - malformed
  - schema-invalid
  - ok
- [ ] Thêm graph AST parser.
- [ ] Đổi graph summary sang symbol-level:
  - component declarations
  - API methods/calls
  - pages
  - files
- [ ] Thêm fixture tests cho graph:
  - nested components in one file
  - custom API client
  - hook calling API client
  - relative imports
- [ ] Chạy full build/typecheck/test.

### Phase Z2 — P1 Hardening

- [ ] Config hóa CORS origin.
- [ ] Config hóa large-file threshold.
- [ ] Thêm file scan budget:
  - max files
  - max file bytes
  - ignored patterns
- [ ] Tách `dashboard-shell.tsx` nếu vẫn vượt giới hạn.
- [ ] Chuẩn hóa UI API error handling.
- [ ] Hardening CLI lifecycle.
- [ ] Viết docs cho config/routes/rules/graph semantics.

### Phase Z3 — Feature Work Resume

Chỉ sau Z1 + Z2 pass:

- [ ] Playwright automation.
- [ ] Screenshot capture.
- [ ] DOM bounding boxes.
- [ ] AABB visual checks.
- [ ] Auth storage-state.
- [ ] Cache diff.
- [ ] NPM publish readiness.

---

## 5. Cam Kết Kiến Trúc Từ Commit Tiếp Theo

Từ thời điểm tài liệu này được áp dụng:

- Không tạo module mới với mock data nếu SRS yêu cầu logic thật.
- Không đánh dấu `Done` khi chưa có test và docs.
- Không hardcode path/origin/threshold trong business logic.
- Không trust HTTP input.
- Không đọc/ghi JSON runtime mà không validate schema ở boundary phù hợp.
- Không dùng heuristic-only nếu module được tuyên bố production-grade.
- Không publish package khi CLI lifecycle chưa pass.
- Không mở rộng feature mới nếu P0 technical debt còn mở.

Chuẩn merge tối thiểu cho mọi module mới:

1. Type-safe compile.
2. Runtime validation tại trust boundary.
3. Unit test hoặc fixture test.
4. No hardcoded path/origin/threshold.
5. Error handling rõ.
6. Docs cập nhật.
7. Build/typecheck pass.