Bạn là Senior Solution Architect + Staff TypeScript Engineer.
Nhiệm vụ của bạn là đọc toàn bộ tài liệu kế hoạch trong repo Lutest, audit code hiện tại, sau đó refactor dự án từ hướng MVP/local-core sang hướng production-grade theo đúng lộ trình mới.

## 0. Tài liệu bắt buộc phải đọc trước khi sửa code

Hãy đọc kỹ các file sau nếu tồn tại trong repo:

```txt
docs/plan/master-srs-context.md
docs/plan/master-srs-production.md
docs/plan/production-implementation-roadmap.md
docs/plan/api-contract-production.md
docs/plan/graph-ast-symbol-design.md
docs/plan/production-test-fixtures-plan.md
docs/plan/migration-plan-from-mvp-to-production.md
docs/plan/zero-debt-audit-roadmap.md
docs/plan/project-progress-total-timeline.md
```

Nếu file nằm ở root hoặc tên hơi khác, hãy tìm file tương ứng.
Nếu thiếu file quan trọng, hãy báo rõ file nào thiếu, nhưng vẫn audit được phần code hiện tại.

## 1. Bối cảnh dự án hiện tại

Dự án Lutest trước đó đang đi theo kế hoạch MVP/local-core.

Trạng thái hiện tại nên được coi là checkpoint:

```txt
C0 — MVP checkpoint:
- Đã có monorepo.
- Đã có CLI host.
- Đã có Express worker.
- Đã có contracts package.
- Đã có project detection.
- Đã có scan route.
- Đã có graph v1 quét source files.
- Đã có đếm page/component/api/file ở mức file-level.
- Đã có report/latest report pipeline.
```

Từ bây giờ không tiếp tục mở rộng theo MVP nữa.
Không làm Playwright, DOM bounding boxes, screenshot, AABB, contrast, auth, cache diff trước khi refactor production foundation xong.

## 2. Mục tiêu refactor

Không được đập toàn bộ để viết lại từ đầu.

Hãy giữ các phần đúng:

```txt
- monorepo structure
- apps/cli-host
- apps/worker-node
- apps/ui nếu đang chạy được
- packages/contracts
- Express worker module boundaries
- status/project/graph/scan/report/rule modules
- pathService/storageService concept
```

Nhưng phải refactor các phần MVP thành production-grade:

```txt
- scan route naming
- runtime API validation
- path security policy
- report schema integrity
- graph từ file-level sang AST symbol-level
- graph contract production
- import resolver production
- CLI lifecycle production
- test fixtures
- progress tracking
```

## 3. Nguyên tắc làm việc bắt buộc

Không được sửa code ngay lập tức.

Hãy làm theo thứ tự:

### Step A — Đọc docs và audit code

Trước tiên, tạo hoặc cập nhật file:

```txt
docs/plan/production-refactor-progress.md
```

File này phải ghi rõ:

```txt
1. Current MVP checkpoint
2. Old plan status
3. New production plan target
4. Gap list
5. Refactor phases
6. Current phase
7. Done / In Progress / Blocked
8. Files changed
9. Tests required
10. Next action
```

Sau khi audit, hãy liệt kê rõ vấn đề cũ của dự án, ví dụ:

```txt
- Graph hiện đang file-level, chưa phải AST symbol-level.
- componentCount/pageCount/apiCount hiện có nguy cơ chỉ là vanity metrics nếu không phục vụ route coverage, issue mapping, cache diff.
- API route scan có thể đang lệch giữa /api/scan và /api/actions/scan.
- Report read có thể chưa phân biệt missing/malformed/schema-invalid.
- Path policy có thể chưa giới hạn allowed project root.
- CLI có thể vẫn chạy kiểu dev runner, chưa phải product CLI.
- Import resolver có thể chưa xử lý tsconfig paths/baseUrl/@ alias.
```

Không được nói chung chung. Phải dẫn file code cụ thể đang có vấn đề.

### Step B — Đánh dấu điểm dừng MVP

Trong `production-refactor-progress.md`, ghi rõ:

```txt
MVP checkpoint accepted:
The old MVP path stops at source scanning + project detection + file-level graph counting.
From this point forward, graph counting must be upgraded into production AST symbol graph.
```

Điều này có nghĩa:

```txt
Không xóa graph v1 ngay.
Không gọi graph v1 là production.
Dùng graph v1 làm baseline/migration input.
Tạo production graph layer mới hoặc refactor từng phần có kiểm soát.
```

### Step C — Tạo migration plan trong code

Trước khi sửa graph, hãy xác định:

```txt
- Contract hiện tại đang là gì.
- UI đang cần response shape nào.
- Worker route đang trả shape nào.
- Có cần legacy mapper không.
- Có thể thêm production graph response song song không.
```

Nếu phá contract làm UI chết thì phải tạo adapter/migration rõ.

## 4. Thứ tự refactor bắt buộc

Làm theo phase. Không nhảy cóc.

---

# Phase R0 — Repo hygiene + baseline

Mục tiêu: biết code hiện tại đang ở đâu.

Việc cần làm:

```txt
1. Chạy typecheck/build/test hiện có nếu có script.
2. Ghi kết quả vào docs/plan/production-refactor-progress.md.
3. Kiểm tra repo có commit node_modules/dist/.lutest không.
4. Kiểm tra .gitignore.
5. Không sửa feature lớn ở phase này.
```

Definition of Done:

```txt
- Có baseline rõ.
- Có danh sách lỗi hiện tại.
- Có progress file.
- Không có thay đổi kiến trúc lớn.
```

---

# Phase R1 — API route + validation boundary

Mục tiêu: chốt API production boundary.

Việc cần làm:

```txt
1. Chốt canonical scan route là POST /api/actions/scan.
2. Nếu hiện còn /api/scan, giữ làm legacy alias tạm thời.
3. UI/docs/code mới phải dùng /api/actions/scan.
4. Thêm hoặc hoàn thiện runtime validators trong packages/contracts.
5. Controller phải validate request trước khi gọi service.
6. Error response phải chuẩn ApiErrorResponse.
```

Routes production tối thiểu:

```txt
GET  /api/status
GET  /api/project
GET  /api/graph
GET  /api/report/latest
POST /api/actions/scan
```

Definition of Done:

```txt
- /api/actions/scan hoạt động.
- /api/scan nếu còn thì chỉ là legacy alias.
- Invalid request trả 400 INVALID_REQUEST.
- Không controller nào trust req.body/query trực tiếp.
- typecheck/build pass.
- progress file được cập nhật.
```

---

# Phase R2 — Path policy production

Mục tiêu: Worker không được scan tùy tiện toàn filesystem.

Việc cần làm:

```txt
1. Tìm pathService/pathPolicyService hiện tại.
2. Đảm bảo project root tồn tại và là directory.
3. Thêm allowedRoot policy:
   - allowedRoot lấy từ CLI/env/config lúc worker startup.
   - request projectPath phải bằng allowedRoot hoặc nằm trong allowedRoot nếu policy cho phép.
   - path ngoài allowedRoot trả PATH_NOT_ALLOWED.
4. Không dùng process.cwd() bừa bãi trong worker service.
5. Mọi .lutest path phải đi qua pathService.
```

Definition of Done:

```txt
- Path ngoài allowedRoot bị chặn.
- Missing/non-directory path trả lỗi rõ.
- Không silent scan nhầm folder.
- Có test hoặc self-check tối thiểu.
- progress file được cập nhật.
```

---

# Phase R3 — Report integrity

Mục tiêu: report không được đọc lỗi rồi trả null mù.

Việc cần làm:

```txt
1. Refactor storage/report read thành result type:
   - ok
   - missing
   - malformed
   - schema-invalid
   - permission-denied
2. Latest report API phải phân biệt missing report với malformed report.
3. Validate ScanResponse trước khi ghi và trước khi trả.
4. Ghi report nên dùng safe/atomic write nếu khả thi.
```

Definition of Done:

```txt
- Missing latest report không crash.
- Malformed report không bị nuốt thành report:null.
- Schema invalid trả error/state rõ.
- UI không crash khi report missing.
- progress file được cập nhật.
```

---

# Phase R4 — Graph production contract

Mục tiêu: mở đường cho AST symbol graph.

Không tiếp tục dùng graph chỉ có:

```txt
page | component | api | file
```

như production model duy nhất.

Thiết kế contract production cần hỗ trợ tối thiểu:

```txt
GraphNodeKind:
- file
- page
- component
- hook
- api-route
- api-client-method
- utility
- external-endpoint

GraphEdgeKind:
- import
- render
- call
- http
- route
```

Graph node nên có:

```txt
id
kind
name
filePath
loc
route
http metadata nếu có
confidence nếu cần
```

Graph edge nên có:

```txt
id
kind
source
target
confidence
reason
```

Definition of Done:

```txt
- Contract production được thêm rõ.
- Legacy graph response nếu UI cần vẫn có mapper.
- Không phá UI cũ nếu chưa migrate UI.
- progress file được cập nhật.
```

---

# Phase R5 — AST symbol graph engine

Mục tiêu: thay graph file-level bằng graph symbol-level.

Tạo hoặc refactor module graph theo hướng:

```txt
apps/worker-node/src/modules/graph/ast/
  parse-source-file.ts
  extract-symbols.ts
  extract-imports.ts
  resolve-imports.ts
  extract-jsx-usage.ts
  extract-calls.ts
  extract-api-calls.ts
  graph-linker.ts
```

Pipeline bắt buộc:

```txt
source files
-> AST parse
-> symbol declarations
-> imports
-> JSX usage
-> call expressions
-> API calls
-> resolve imports
-> create symbol nodes
-> create import/render/call/http edges
-> summary
```

Graph production phải trả lời được:

```txt
- Page nào tồn tại?
- Page route là gì?
- Page render component nào?
- Component dùng hook nào?
- Hook/service gọi API client nào?
- API client gọi endpoint nào?
- API route handler nào tồn tại?
```

Không được chỉ trả lời:

```txt
- File nào có fetch?
- File nào nằm trong components?
```

Definition of Done:

```txt
- Component count dựa trên declaration, không chỉ file.
- API count dựa trên API route/API client method/API calls, không chỉ file.
- Import resolver xử lý relative + extension + index.
- Nếu có tsconfig paths/baseUrl/@ alias thì xử lý hoặc ghi rõ unsupported với confidence thấp.
- Có fixture test tối thiểu cho Next.js app router.
- progress file được cập nhật.
```

---

# Phase R6 — Fixture tests

Tạo fixtures theo plan:

```txt
fixtures/next-basic-shop
fixtures/next-custom-api-client
fixtures/vite-react-dashboard
fixtures/vue-basic
fixtures/laravel-basic
```

Bắt đầu tối thiểu với:

```txt
fixtures/next-basic-shop
fixtures/next-custom-api-client
```

Test phải assert:

```txt
- detect framework đúng.
- route discovery đúng.
- component declaration count đúng.
- page count đúng.
- API route count đúng.
- API client method count đúng.
- render/call/http edges đúng.
- alias import @/* resolve đúng nếu supported.
- dynamic endpoint không bị báo chắc tuyệt đối.
```

Definition of Done:

```txt
- Có fixture.
- Có test.
- Test fail nếu quay lại file-level counting.
- progress file được cập nhật.
```

---

# Phase R7 — CLI production lifecycle

Mục tiêu: CLI không còn chỉ là dev runner.

Cần có command:

```bash
lutest scan <projectPath>
```

CLI production phải:

```txt
1. Parse args.
2. Validate project path.
3. Pick available port.
4. Spawn worker packaged runtime.
5. Wait GET /api/status.
6. Call POST /api/actions/scan.
7. Print result summary.
8. Shutdown worker cleanly.
9. Exit code:
   - 0 passed
   - 1 failed/error
   - 2 invalid input
```

Definition of Done:

```txt
- lutest scan <fixturePath> chạy end-to-end.
- Worker được cleanup.
- Exit code đúng.
- Không phụ thuộc npm run dev cho production path.
- progress file được cập nhật.
```

---

# Phase R8 — UI migration

Chỉ làm sau khi backend contracts ổn.

UI phải:

```txt
- gọi /api/actions/scan.
- đọc production graph hoặc legacy mapped graph.
- hiển thị rõ graph mode:
  - file-level
  - symbol-level
- không mock data ở flow chính.
- có loading/error/empty/stale states.
- không crash khi report missing/schema-invalid.
```

Definition of Done:

```txt
- Dashboard dùng API thật.
- Không assume field ngoài contracts.
- Hiển thị được production graph summary.
- progress file được cập nhật.
```

---

## 5. Những việc tuyệt đối chưa làm

Không làm các việc này cho đến khi R1-R6 pass:

```txt
- Playwright browser automation
- screenshot capture
- DOM bounding boxes
- AABB overlap check
- contrast check
- auth manual flow
- cache diff
- npm publish
- UI graph animation/polish
```

Lý do: nếu graph/contract/path/report còn sai, các feature này sẽ xây trên nền sai.

## 6. Quy tắc khi sửa code

Bắt buộc:

```txt
- Không dùng any nếu không có lý do rõ.
- Không thêm field API ngoài contract.
- Không cast as unknown as Type để né lỗi.
- Không placeholder/TODO trong production code.
- Không mock data ở API thật.
- Không hardcode .lutest path rải rác.
- Không hardcode CORS/worker URL nếu config có thể quản lý.
- Không swallow error.
```

Nếu feature chưa làm, phải:

```txt
- không expose như đã xong; hoặc
- trả lỗi rõ Feature not implemented; hoặc
- ghi rõ trong progress/backlog.
```

## 7. Output tôi cần từ bạn sau mỗi phase

Sau mỗi phase, hãy trả lời theo format:

```txt
Phase completed: <phase name>

Changed files:
- ...

What was fixed:
- ...

What remains:
- ...

Tests run:
- command
- result

Progress file updated:
- yes/no

Next recommended phase:
- ...
```

Nếu gặp lỗi hoặc ambiguity, không tự đoán bừa.
Hãy ghi rõ blocker và đề xuất phương án tốt nhất.

## 8. Việc đầu tiên cần làm ngay bây giờ

Bắt đầu bằng Phase R0.

Không sửa code feature ngay.

Hãy:

```txt
1. Đọc toàn bộ docs.
2. Audit repo hiện tại.
3. Tạo/cập nhật docs/plan/production-refactor-progress.md.
4. Ghi rõ MVP checkpoint hiện tại.
5. Liệt kê vấn đề cũ theo file cụ thể.
6. Đề xuất Phase R1 cụ thể với danh sách file sẽ sửa.
```

Sau khi hoàn thành R0, dừng lại và báo cáo trước khi tiếp tục R1.
