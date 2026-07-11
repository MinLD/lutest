# Lutest Production Completion Roadmap

## Mục tiêu cuối cùng

Lutest là một **local-first Code + UX Audit Platform** hoàn chỉnh.

Sản phẩm sau khi hoàn thành phải làm được toàn bộ vòng lõi:

```txt
source code scan
→ production graph
→ production graph artifact
→ runtime browser preflight
→ runtime target model: route / state / flow
→ browser runtime scan
→ DOM geometry
→ viewport matrix
→ layout issue detection
→ runtime artifacts
→ scan/report pipeline
→ dashboard UI
→ auth storage state cho app cần login
→ docs/runbook
→ self-check/build/audit
→ legacy backend removed hoặc gated debug-only
```

Khi hoàn thành toàn bộ roadmap này, dự án được gọi là:

```txt
Lutest Production Clean Complete
```

Đây không phải MVP, không phải bản demo tạm, không phải code làm nhanh rồi refactor sau.

---

## Nguyên tắc bắt buộc

Phase nào làm xong thì phải là **production-grade**. Phase sau chỉ được mở rộng phase trước, không được phải sửa lại nền tảng vì phase trước làm tạm.

Không được:

```txt
- Không làm tạm.
- Không dùng any bừa.
- Không bỏ validator.
- Không bypass path-policy.
- Không đổi API shape nếu phase chưa chốt.
- Không hardcode đường dẫn máy local.
- Không xóa legacy backend nếu chưa audit sạch.
- Không tạo JSON artifact không schema/type rõ.
- Không nói test pass nếu chưa chạy.
- Không “để phase sau refactor lại”.
- Không commit generated .lutest artifacts.
- Không dùng browser người dùng đang mở dashboard để scan.
- Không auto-click destructive action nếu user không khai báo rõ.
- Không log cookie/token/password/storageState raw ra console/report/UI.
```

Definition of Done cho mỗi phase:

```txt
- Code đúng kiến trúc hiện tại.
- Contract/type rõ nếu có dữ liệu mới.
- Validator/self-check cập nhật.
- Artifact path rõ nếu có ghi file.
- Path-policy giữ strict.
- Build/typecheck pass.
- Docs/context cập nhật.
- Known limitations ghi trung thực.
```

---

## Trạng thái hiện tại

Đã hoàn thành / đã commit hoặc đang có trong working tree cần verify trước implementation:

```txt
R6.0.2 — Runtime Browser Preflight
R6.1   — Runtime Internal Contracts, Limits & Artifact Shape
R6.2   — Runtime Artifact Repository Foundation
R6.3   — Runtime Target Model & Discovery Modes
R6.4   — DOM Geometry Foundation
R6.5   — Viewport Matrix
R6.6   — Manual State/Flow Execution
R6.7   — Runtime Layout Issue Engine
R6.8   — Runtime Artifact Repository Hardening

R7.1   — Public Runtime Contracts
R7.2   — Scan Service Integration
R7.3   — Latest Report Integration
R7.4   — Auth StorageState Integration

R8.1   — Dashboard Runtime Summary UI
R8.2   — Runtime Report UI
R8.3   — Screenshot / Evidence Viewer
```

Current next phase:

```txt
R8.4 — Runtime Artifact Detail API & Evidence Model Hardening
```

Trước khi implementation phase mới, phải verify bằng:

```bash
git log --oneline -10
git status --short
```

Không bịa commit hash. Nếu phase nằm trong working tree chưa commit, ghi rõ khi báo cáo.

Hiện trạng:

```txt
- Production graph là primary graph path.
- Frontend dashboard dùng /api/graph/production làm normal flow.
- Production graph đã lưu artifact vào .lutest.
- Backend /api/graph còn giữ compatibility/debug.
- Runtime scan đã có browser preflight, target model, DOM geometry, viewport matrix, AABB layout issue engine, screenshot artifact, auth storageState opt-in.
- Latest report hiện có runtime summary; full runtime artifact detail/safe screenshot serving vẫn cần R8.4.
- Dashboard đã có runtime summary/report/evidence shell nhưng chưa có safe screenshot preview overlay.
```

---

# Stage 0 — Baseline Lock

## P0.1 — Baseline Lock

### Mục tiêu

Khóa trạng thái sạch trước khi tiếp tục R6.

Cần đảm bảo:

```txt
- R5.8.1 đã commit.
- R5.9 đã commit.
- Không còn diff rác.
- Không commit .lutest generated artifacts.
- packages/contracts/dist noise được xử lý.
- Production graph audit pass.
- Runtime scan self-check pass.
```

### KPI

```txt
PASS nếu:
- git status chỉ còn file chủ ý hoặc clean.
- packages/contracts và apps/worker-node/src/modules/scan không có diff ngoài phase đã chốt.
- production graph HTTP self-check pass.
- production graph accuracy audit pass.
- runtime scan self-check pass.
```

### Không làm

```txt
- Không thêm feature.
- Không sửa runtime scan.
- Không sửa UI.
- Không đổi contracts.
```

---

# Stage 1 — Runtime Scan Core Production

Stage này biến Lutest từ source graph analyzer thành runtime UX auditor thật.

Điểm sửa quan trọng so với roadmap cũ:

```txt
- Browser preflight phải có trước DOM Geometry.
- Internal runtime contracts/artifact shape phải có trước khi ghi runtime artifact mới.
- Runtime artifact repository contract/foundation phải có sớm để Playwright service không ghi JSON trực tiếp.
- Runtime target model phải có sớm để không bị hardcode theo route-only.
- Basic performance guardrails phải có ngay từ R6.1, không đợi hardening cuối.
```

---

## R6.0.2 — Runtime Browser Preflight

### Mục tiêu

Runtime scan phải kiểm tra Playwright Chromium có khả dụng trước khi chạy scan thật.

Production behavior:

```txt
- Nếu Playwright Chromium khả dụng: preflight pass.
- Nếu thiếu browser: trả lỗi có code PLAYWRIGHT_BROWSER_MISSING.
- Không crash worker.
- Không leak raw stack trace ra UI bình thường.
- Có remediation message rõ: npx playwright install chromium.
- Không dùng Chrome/trình duyệt người dùng đang mở dashboard.
```

### Không làm

```txt
- Không làm DOM Geometry.
- Không đổi /api/actions/scan.
- Không đổi ScanRequest/ScanResponse.
- Không làm UI.
- Không tự cài browser từ code runtime.
```

### KPI

```txt
PASS nếu:
- Có preflight helper/service rõ.
- Runtime scan gọi preflight ở điểm phù hợp.
- Browser missing được model hóa bằng error code rõ.
- Self-check cover success path.
- Có cách test/verify missing-browser behavior hoặc unit-level classification.
- Existing runtime scan self-check vẫn pass.
```

---

## R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

### Mục tiêu

Chuẩn hóa **internal runtime types/schema** trước khi thêm DOM Geometry/viewport/issues và trước khi ghi artifact mới.

Đây không phải public API contracts. Public contracts cho `/api/actions/scan` sẽ làm ở R7.1.

Cần định nghĩa hoặc chuẩn hóa internal types:

```txt
RuntimeScanResult
RuntimeScanTarget
RuntimeRouteTarget
RuntimeStateTarget
RuntimeFlowTarget
RuntimeRouteResult hoặc RuntimeTargetResult
RuntimeViewportResult
RuntimeScanLimits
RuntimeScanError
RuntimeArtifactMeta
DomGeometry
DomElementGeometry
RuntimeLayoutIssue placeholder nếu cần
```

Cần có limits mặc định ngay từ đầu:

```txt
maxRoutes
maxTargets
maxElementsPerViewport
maxTextSnippetLength
maxScreenshots
routeTimeoutMs
scanTimeoutMs
ignoredTags
```

Artifact shape nội bộ phải có version:

```txt
schemaVersion
scanId
generatedAt
projectRoot hoặc selectedRoot metadata an toàn
targets[]
limits
errors[]
```

Repository contract requirement:

```txt
- Chỉ định nghĩa interface/type/path contract cho runtime artifact repository.
- Chưa implement full save/read behavior ở phase này.
- Không cho Playwright service tạo thêm JSON artifact ad-hoc mới.
- Nếu runtime scan hiện tại đang ghi artifact, phải ghi nhận đường ghi hiện tại và chuẩn bị migration plan sang repository R6.2.
- R6.2 sẽ implement save/read latest và migrate runtime scan write path sang repository.
```

### Không làm

```txt
- Không đổi /api/actions/scan.
- Không đổi ScanRequest/ScanResponse.
- Không làm DOM extraction thật nếu chưa tới R6.4.
- Không làm UI.
- Không expose public API shape mới.
```

### KPI

```txt
PASS nếu:
- Internal runtime result shape có type rõ.
- Có validator/self-check cho artifact shape nội bộ.
- Limits có default rõ và được dùng bởi runtime scan config.
- maxTextSnippetLength/maxElementsPerViewport/ignoredTags có chỗ cấu hình rõ.
- Không còn JSON runtime artifact mới kiểu ad-hoc không schema.
- Có interface/type/path contract cho runtime artifact repository.
- Chưa yêu cầu full save/read implementation ở R6.1.
- Playwright service không được thêm đường ghi JSON ad-hoc mới.
```

---

## R6.2 — Runtime Artifact Repository Foundation

### Mục tiêu

Implement runtime artifact repository foundation dựa trên interface/type/path contract đã chốt ở R6.1.

R6.2 là phase thực sự tạo save/read behavior và migrate runtime scan write path sang repository. Sau phase này, Playwright/runtime scan service không được tự ghi runtime JSON trực tiếp nữa.

Artifact path chuẩn tối thiểu:

```txt
<projectRoot>/.lutest/runtime/latest-runtime-scan.json
<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json
```

File đề xuất:

```txt
apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.ts
apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts
```

Repository foundation cần implement:

```txt
runtimeScanArtifactPaths(...)
saveLatestRuntimeScan(...)
readLatestRuntimeScan(...)
validate persisted RuntimeScanResult bằng internal validator R6.1
write metadata riêng nếu metadata không thuộc raw result shape
migrate runtime scan write path sang repository/helper này
```

### Không làm

```txt
- Không làm DOM Geometry.
- Không làm viewport matrix.
- Không làm issue detector.
- Không đổi /api/actions/scan.
- Không expose public API shape mới.
- Không commit generated .lutest artifacts.
```

### KPI

```txt
PASS nếu:
- save/read latest runtime scan hoạt động với internal validator R6.1.
- artifact nằm trong selected project root.
- Playwright/runtime scan service dùng repository/helper thay vì tự ghi JSON trực tiếp cho runtime artifact.
- metadata không làm bẩn RuntimeScanResult raw shape.
- path-policy không bị bypass.
- self-check cover artifact path, save, read, validate.
```

---

## R6.3 — Runtime Target Model & Discovery Modes

### Mục tiêu

Runtime scan không được hardcode route-only. Cần target model để scan được app thật, đặc biệt SPA dashboard chỉ có `/` nhưng nhiều state/tab/sidebar.

Target model tối thiểu:

```txt
scanTarget:
  id
  kind: route | state | flow
  name
  route
  source: discovered | selected | custom | config
  steps?       // chỉ cho state/flow
```

Discovery/selection modes:

```txt
all discovered routes
selected routes
custom targets
manual/configured flow targets
```

Target result sau này phải gắn theo:

```txt
scanTargetId
scanTarget.kind
route
state/flow name nếu có
```

### Không làm

```txt
- Không auto-click toàn bộ app.
- Không click destructive actions như delete/logout/submit nếu không được khai báo.
- Không AI tự hiểu form.
- Không lưu secret trong artifact.
- Không làm DOM Geometry nếu chưa tới R6.4.
```

### KPI

```txt
PASS nếu:
- Existing route discovery vẫn hoạt động.
- Có target model dùng được cho route targets.
- Có custom target config tối thiểu.
- Kết quả runtime scan không bị khóa cứng theo routes[] cũ nếu có thể tránh.
- Self-check chứng minh route target và custom target được normalize đúng.
```

---

## R6.4 — DOM Geometry Foundation

### Mục tiêu

Runtime scan phải extract DOM geometry thật từ browser cho từng scan target/route.

Mỗi viewport result cần có:

```txt
scanTargetId
route
viewport
screenshot
console/page/network errors
domGeometry.elements[]
```

Element geometry tối thiểu:

```txt
- stable internal id
- tagName
- selectorHint
- id attribute nếu có
- className nếu có
- role nếu có
- ariaLabel nếu có
- textSnippet giới hạn
- bounding box: x, y, width, height, top, right, bottom, left
- visibility metadata: display, visibility, opacity nếu lấy được
- clickable heuristic
- element order/index
```

Filtering/limits bắt buộc:

```txt
- Chỉ lấy elements visible hoặc có bounding box hữu ích.
- Bỏ script/style/meta/link/noscript/template/svg defs nếu phù hợp.
- Bỏ element area = 0 trừ khi cần debug visibility.
- Enforce maxElementsPerViewport.
- Enforce maxTextSnippetLength.
- Large DOM không được làm crash scan.
```

### Không làm

```txt
- Không đổi /api/actions/scan.
- Không đổi ScanRequest/ScanResponse.
- Không làm issue detection.
- Không làm UI.
- Không làm auth.
```

### KPI

```txt
PASS nếu:
- Runtime scan artifact có DOM geometry theo internal schema R6.1.
- Known element trong self-check có bounding box hợp lệ.
- script/style/meta/link không bị capture.
- textSnippet bị giới hạn.
- maxElementsPerViewport được enforce.
- route/target lỗi không làm chết toàn scan nếu behavior hiện tại là per-target error.
- local-only baseUrl vẫn giữ.
- path-policy pass.
```

---

## R6.5 — Viewport Matrix

### Mục tiêu

Runtime scan chạy chuẩn qua nhiều viewport.

Viewport mặc định production:

```txt
mobile: 390x844
tablet: 768x1024
desktop: 1440x900
```

Cấu trúc result cần rõ:

```txt
targets[]
  viewports[]
    viewport
    screenshotPath
    domGeometry
    consoleErrors
    pageErrors
    networkErrors
```

### Không làm

```txt
- Không tích hợp /api/actions/scan nếu chưa tới R7.
- Không làm UI.
- Không làm issue engine nếu chưa tới R6.7.
- Không tạo API shape public mới.
```

### KPI

```txt
PASS nếu:
- Một target scan đủ 3 viewport.
- Screenshot filename không collision.
- DOM geometry đúng theo từng viewport.
- Artifact không phình vô hạn vì đã có limits.
- Self-check cover viewport matrix.
```

---

## R6.6 — Manual State/Flow Execution

### Mục tiêu

Runtime scan hỗ trợ scan nhiều state/flow của SPA mà không auto-click bừa.

Flow step tối thiểu:

```txt
goto
click
fill
waitForSelector
waitForTimeout nếu cần nhưng hạn chế
screenshot marker nếu cần
```

Config ví dụ:

```txt
{
  "id": "dashboard-settings",
  "kind": "flow",
  "name": "Dashboard Settings",
  "route": "/",
  "steps": [
    { "action": "click", "selector": "[data-lutest-nav='settings']" },
    { "action": "waitForSelector", "selector": "[data-lutest-screen='settings']" }
  ]
}
```

Flow fill safety:

```txt
- Không ghi raw fill value vào artifact/report/log.
- Artifact chỉ ghi action type, selector và redacted=true cho fill value.
- Hỗ trợ valueFromEnv cho dữ liệu nhạy cảm.
- Nếu dùng value trực tiếp trong config, phải cảnh báo và không echo lại value.
- Không lưu password/token/email test nhạy cảm trong docs artifact mẫu.
```

Ví dụ fill an toàn:

```json
{
  "action": "fill",
  "selector": "input[name='email']",
  "valueFromEnv": "LUTEST_TEST_EMAIL"
}
```

### Không làm

```txt
- Không auto-crawler click toàn bộ app.
- Không click submit/delete/logout nếu không được khai báo rõ.
- Không AI tự điền form.
- Không lưu secret trong artifact.
- Không log raw fill value.
- Không làm auth storageState nếu chưa tới R7.4.
```

### KPI

```txt
PASS nếu:
- App một route `/` nhưng nhiều state có thể scan nhiều target.
- Flow config chạy được kịch bản đơn giản.
- Screenshot/DOM/issue sau này gắn đúng scanTarget.
- Destructive action protection rõ.
- Fill step redaction được enforce.
- valueFromEnv hoạt động cho dữ liệu nhạy cảm.
- Self-check có một state/flow target đơn giản.
```

---

## R6.7 — Runtime Layout Issue Engine

### Mục tiêu

Tách issue detector thành module riêng, không nhét logic vào Playwright service.

File đề xuất:

```txt
apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.ts
apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts
```

Issue types production tối thiểu:

```txt
horizontal-overflow
element-outside-viewport
small-click-target
suspicious-overlap
zero-size-visible-element
```

Mỗi issue phải có:

```txt
id
type
severity
message
scanTargetId
route
viewport
elementRef
evidence
```

Evidence phải có:

```txt
selectorHint
boundingBox
viewport
screenshotPath nếu có
threshold/rule info
```

### Không làm

```txt
- Không làm contrast nếu chưa đủ chắc.
- Không OCR.
- Không AI analysis.
- Không UI.
```

### KPI

```txt
PASS nếu:
- Detector chạy từ DOM geometry, không phụ thuộc browser.
- Self-check tạo input giả và detect đúng issue.
- Severity mapping rõ.
- Threshold rõ.
- Không spam false positive quá mức.
- Issue gắn với scanTargetId, không chỉ route string.
```

---

## R6.8 — Runtime Artifact Repository Hardening

### Mục tiêu

Hoàn thiện runtime artifact repository sau khi DOM Geometry, viewport matrix, flow và issue engine đã dùng chung artifact repository foundation từ R6.2.

Phase này là final repository hardening, không phải lần đầu tạo artifact writer.

Artifact path chuẩn:

```txt
<projectRoot>/.lutest/runtime/latest-runtime-scan.json
<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json
```

Snapshot nếu thiết kế xong:

```txt
<projectRoot>/.lutest/runtime/scans/<scanId>.json
```

File đề xuất:

```txt
apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.ts
apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts
```

### KPI

```txt
PASS nếu:
- save/read latest runtime scan hoạt động qua repository R6.2.
- Không còn runtime artifact write rải rác ngoài repository/helper.
- artifact nằm trong selected project root.
- path-policy không bị bypass.
- artifact validate được bằng internal runtime validator.
- snapshots nếu có được thiết kế rõ, không ad-hoc.
- không commit generated artifact.
- metadata không làm bẩn RuntimeScanResult raw shape.
```

---

# Stage 2 — Contracts, Reports, API Integration

Stage này chính thức đưa runtime scan vào sản phẩm, không còn chỉ là internal self-check.

---

## R7.1 — Public Runtime Contracts

### Mục tiêu

Chuẩn hóa contracts public cho runtime scan khi tích hợp API/report.

Thêm hoặc hoàn thiện type/validator cho:

```txt
RuntimeScanRequest
RuntimeScanResult
RuntimeScanTarget
RuntimeViewportResult
DomGeometry
DomElementGeometry
RuntimeLayoutIssue
RuntimeArtifactMeta
```

Nếu tích hợp với scan:

```txt
ScanRequest.runtimeScan
ScanResponse.runtimeScan
LatestReportResponse.runtimeScan
```

### Quy tắc

```txt
- runtimeScan phải opt-in.
- Không truyền runtimeScan thì scan cũ không đổi behavior.
- external baseUrl bị reject.
- Playwright missing browser có error code rõ.
- storageState/auth chỉ thêm khi R7.4 chốt.
```

### KPI

```txt
PASS nếu:
- contracts build pass.
- validators self-check pass.
- invalid runtime request bị reject đúng.
- valid runtime request parse đúng.
- no loose any/schema lỏng.
- public contract không mâu thuẫn internal artifact shape.
```

---

## R7.2 — Scan Service Integration

### Mục tiêu

`POST /api/actions/scan` chạy được cả static scan và runtime scan opt-in.

Flow chuẩn:

```txt
POST /api/actions/scan
  -> validate request
  -> resolve selected project root
  -> run static scan
  -> if runtimeScan enabled:
       validate baseUrl local-only
       run browser preflight
       normalize scan targets
       run runtime scan
       persist runtime artifact
       attach runtime summary/report
  -> save latest report
  -> return response
```

### Error model

Cần phân biệt:

```txt
CONFIG_ERROR
PATH_NOT_ALLOWED
BASE_URL_NOT_LOCAL
PLAYWRIGHT_BROWSER_MISSING
ROUTE_DISCOVERY_ERROR
TARGET_EXECUTION_ERROR
ROUTE_SCAN_ERROR
ARTIFACT_WRITE_ERROR
RUNTIME_SCAN_FAILED
```

### KPI

```txt
PASS nếu:
- scan không runtimeScan vẫn pass.
- scan có runtimeScan pass.
- target/route error không phá toàn bộ scan nếu đã là per-target error.
- config error fail rõ.
- latest report đọc lại được runtime result hoặc runtime summary.
- external baseUrl vẫn bị reject.
```

---

## R7.3 — Latest Report Integration

### Mục tiêu

Report phải là source-of-truth cho dashboard.

Latest report cần chứa hoặc link tới:

```txt
static scan summary
production graph artifact path
runtime scan summary
runtime issue summary
artifact refs
generatedAt
projectRoot/selectedRoot metadata an toàn
```

Nếu artifact lớn, report nên giữ summary + artifact refs, không nhét toàn bộ artifact nặng vào response.

### KPI

```txt
PASS nếu:
- latest report response validate.
- report reload sau refresh vẫn đúng.
- runtime issue count đúng.
- artifact refs đúng root.
- không expose absolute path nguy hiểm nếu UI không cần.
- UI có thể đọc summary mà không cần load full artifact trước.
```

---

## R7.4 — Auth StorageState Integration

### Mục tiêu

Hỗ trợ app cần login bằng manual auth flow, không tự động hóa auth nhạy cảm.

Endpoints/behavior đề xuất:

```txt
POST /api/actions/auth/start
POST /api/actions/auth/clear
GET  /api/auth/status
```

Contracts/validators bắt buộc trong phase này:

```txt
AuthStatusResponse
AuthStartRequest
AuthStartResponse
AuthClearResponse
```

Auth error codes tối thiểu:

```txt
AUTH_STATE_MISSING
AUTH_STATE_INVALID
AUTH_STATE_WRITE_FAILED
AUTH_SESSION_START_FAILED
AUTH_SESSION_TIMEOUT
```

Nguyên tắc contracts-first:

```txt
- Không implement endpoint trước rồi mới vá contract sau.
- Request/response auth phải có validator/self-check.
- Auth status response không được chứa raw storageState/cookie/token.
```

Artifact path:

```txt
<projectRoot>/.lutest/auth/storage-state.json
<projectRoot>/.lutest/auth/storage-state.meta.json
```

Flow:

```txt
1. User start manual auth session.
2. Playwright browser mở baseUrl local.
3. User login thủ công.
4. Lutest save storageState vào .lutest/auth/storage-state.json.
5. Runtime scan dùng storageState nếu request/config cho phép.
6. User có thể clear auth state.
```

### Safety

```txt
- Không log cookie/token/password.
- Không hiển thị raw storageState trong UI/report.
- Không commit auth artifact.
- storageState chỉ nằm trong selected project root.
- Clear auth state phải xóa artifact rõ ràng.
```

### KPI

```txt
PASS nếu:
- Auth contracts/validators build và self-check pass.
- Protected route scan được khi có valid auth state.
- Auth missing/invalid có error rõ.
- Auth status endpoint không leak secret.
- Clear auth state hoạt động.
- Runtime scan vẫn chạy được không auth với app public.
```

---

# Stage 3 — Runtime Product UX Completion

Stage này hoàn thiện sản phẩm runtime UX audit thật, không chỉ dashboard UI. Phạm vi gồm API detail, evidence model, screenshot serving, overlay, readability engine, route/target controls, safe interaction discovery, và fix guidance.

Mục tiêu trước khi vào R9 hardening:

```txt
- chọn route hoặc scan all
- chạy runtime scan opt-in rõ ràng
- đọc full runtime artifact detail an toàn
- hiển thị issue list/detail đầy đủ
- mở screenshot qua safe artifact endpoint/ref
- khoanh vùng lỗi trên screenshot bằng bounding box
- check contrast/readability bằng OKLCH hoặc contrast model tương đương
- khám phá interaction state an toàn: click tab/menu/modal/dropdown/accordion để chụp state mới
- giải thích nguyên nhân lỗi và hướng sửa rule-based
```

Không đưa vào Stage 3:

```txt
- Không auto-click destructive action.
- Không tự điền form phức tạp để bypass validation.
- Không test payment/delete/logout/submit nguy hiểm mặc định.
- Không AI/OCR/auto-fix.
- Không visual regression history.
```

---

## R8.1 — Dashboard Runtime Summary UI

### Mục tiêu

Dashboard/report summary hiển thị runtime scan summary từ latest report.

Cần có:

```txt
runtimeScan status
scanId nếu có
baseUrl nếu public result có
runtime target count
viewport count
screenshot count
layout issue count
issue count by severity
top safe runtime errors nếu có
runtimeArtifactMeta/safe artifact ref nếu có
```

Không làm:

```txt
- Không trigger runtime scan từ UI.
- Không đổi backend/contracts nếu không cần.
- Không screenshot gallery.
- Không auth UI.
```

### KPI

```txt
PASS nếu:
- runtimeScan absent hiển thị empty state nhẹ.
- runtimeScan success hiển thị summary.
- runtimeScan failed hiển thị safe error code/message.
- Old report thiếu runtimeScan không crash.
- No raw secret/path/stack leakage.
```

---

## R8.2 — Runtime Report UI

### Mục tiêu

Report page hiển thị runtime audit result rõ ràng.

Cần có:

```txt
Runtime summary card
Targets/routes scanned
Viewports scanned
Screenshot count
Issue count by severity
Issue list
Issue detail panel
Target/route/viewport filter
Summary-only fallback nếu artifact detail chưa load
```

Issue detail phải hiển thị:

```txt
type
severity
message
scanTarget
route
viewport
element selector/ref
bounding box
evidence
screenshot ref/status nếu có
```

### KPI

```txt
PASS nếu:
- latest report reload vẫn hiển thị runtime summary.
- filter target/route/viewport hoạt động khi có full detail.
- empty state khi không có runtime scan.
- error state khi runtime scan fail.
- UI không cần load full heavy artifact chỉ để vẽ summary.
```

---

## R8.3 — Screenshot / Evidence Viewer

### Mục tiêu

Người dùng thấy bằng chứng screenshot/evidence ở mức an toàn hiện có.

Cần có:

```txt
- list screenshot artifacts/ref
- issue detail trỏ tới screenshot tương ứng
- screenshot available/missing state
- no raw absolute filesystem path
- no unsafe .lutest path as URL trực tiếp
```

Overlay deferred nếu chưa có safe screenshot endpoint.

### KPI

```txt
PASS nếu:
- screenshot reference đúng target/route/viewport.
- artifact path không leak ngoài project root.
- UI không crash khi screenshot thiếu.
- issue evidence và screenshot khớp nhau nếu có detail.
- nếu chưa có safe serving endpoint, UI chỉ hiển thị safe ref/status và không render link giả.
```

---

## R8.4 — Runtime Artifact Detail API & Evidence Model Hardening

### Mục tiêu

Chốt evidence model public/internal và bổ sung endpoint/backend layer an toàn để UI đọc full runtime artifact detail + screenshot preview mà không expose raw path.

Cần có:

```txt
GET runtime artifact detail theo selected project root/latest scan
GET screenshot artifact theo safe ref hoặc opaque id
path-policy enforced
artifact ref không traversal
không expose project absolute path
không đọc artifact ngoài selected root
không chạy lại runtime scan khi đọc detail
```

Evidence model cần đảm bảo mỗi issue có đủ:

```txt
scanTargetId
route
stateId/stateLabel nếu là interaction state
viewport width/height
screenshot artifact ref hoặc screenshot unavailable reason
selector/elementRef
boundingBox
relatedBoundingBox nếu có
issue type/severity/message
rule threshold/evidence
issue dedup key
state dedup key nếu có interaction state
```

### KPI

```txt
PASS nếu:
- UI đọc được full runtime artifact detail sau refresh.
- Screenshot preview dùng safe URL/ref.
- Issue always maps to screenshot or explicit missing reason.
- Evidence có scanTargetId, route, viewport, selector, boundingBox, relatedBoundingBox nếu có.
- Absolute path /home/... hoặc C:\... không xuất hiện trong response/UI.
- Missing/malformed artifact trả typed error rõ.
- No cookie/token/password/storageState/raw stack.
```

---

## R8.5 — Route / Target Selection Runtime Scan UI

### Mục tiêu

Dashboard cho phép user chọn route/target để runtime scan rõ ràng.

Cần có:

```txt
route list
scan all
scan selected
select configured flow targets nếu source config có
runtime scan opt-in rõ
baseUrl input
viewport preset
run static scan button
run runtime scan button
```

Không trigger runtime scan khi user chỉ muốn static scan.

### KPI

```txt
PASS nếu:
- User scan all routes được.
- User scan selected routes được.
- Runtime disabled thì static scan cũ không đổi.
- External baseUrl bị reject rõ.
- Browser missing hiển thị remediation.
- Không leak secret.
```

---

## R8.6 — Screenshot Overlay Evidence UI

### Phụ thuộc

```txt
R8.4 safe screenshot endpoint/ref
```

### Mục tiêu

Khoanh vùng lỗi trực tiếp trên screenshot.

Cần có:

```txt
image preview từ safe screenshot endpoint/ref
primary bounding box overlay
related bounding box overlay cho suspicious-overlap nếu có
selected issue highlight
viewport scaling đúng theo displayed image size
missing image fallback
```

Không làm overlay hack.

### KPI

```txt
PASS nếu:
- BoundingBox map đúng screenshot/viewport.
- Resize UI không làm lệch overlay.
- Missing screenshot không crash.
- Không dùng raw local path làm image src.
```

---

## R8.7 — Safe Interaction Discovery

### Mục tiêu

Tự click UI-safe controls để khám phá SPA state không đổi route.

Ví dụ state cần tìm:

```txt
tab
dropdown
modal
accordion
drawer
mobile menu
switch-case panel
filter/sort panel không submit
```

Không làm:

```txt
- Không auto-fill form.
- Không auto-submit.
- Không click delete/logout/save/submit/confirm/payment.
- Không bypass validation.
```

Form-gated controls:

```txt
disabled -> skipped: disabled
required input missing -> skipped: requires-input
destructive candidate -> skipped: destructive
unknown risky -> skipped: unsafe-candidate
```

### Guardrails

```txt
- max interactions per route
- max states per route
- max total scan time
- state dedup by DOM/geometry/screenshot signature
- issue dedup across repeated states
- state naming: baseline, after click "Filter", after open "Sort menu"
```

### KPI

```txt
PASS nếu:
- Safe controls tạo state snapshots.
- State mới dedupe.
- Layout/readability issues chạy trên state mới.
- Skipped controls có reason.
- Performance bounded.
```

---

## R8.8 — Visual Readability / OKLCH Contrast Engine

### Mục tiêu

Bổ sung runtime engine + UI evidence kiểm tra màu chữ/nền khó đọc.

Cần có:

```txt
extract computed foreground/background color từ DOM geometry hoặc runtime style snapshot
convert/normalize màu sang OKLCH hoặc contrast model tương đương
check text readability threshold
emit RuntimeLayoutIssue hoặc RuntimeReadabilityIssue rõ ràng
UI hiển thị color swatch/evidence
```

Có thể dùng OKLCH cho perceptual color reasoning, nhưng vẫn cần threshold rõ và self-check deterministic.

### KPI

```txt
PASS nếu:
- Detect được text khó đọc với foreground/background tương phản thấp.
- Không false-positive quá nhiều với hidden/transparent text.
- Evidence có selector, colors, threshold, viewport.
- UI hiển thị nguyên nhân: màu chữ/nền quá gần nhau.
- Self-check cover light/dark/transparent/inherited color cases.
```

---

## R8.9 — Runtime Fix Guidance UI

### Mục tiêu

Rule-based deterministic guidance, không AI/OCR/auto-fix.

Mỗi issue type có:

```txt
explanation
common causes
suggested CSS/HTML fixes
selector/evidence
limitation: không bịa source file nếu chưa có source map
```

Cần có mapping rule-based:

```txt
horizontal-overflow:
  explain element vượt viewport
  suggest max-width: 100%, remove fixed width, inspect absolute positioning

small-click-target:
  explain tap target nhỏ
  suggest min-width/min-height 44px, padding

suspicious-overlap:
  explain overlap
  suggest inspect z-index/position/margin/responsive layout

zero-size-visible-element:
  explain visible but no size
  suggest inspect display/content/layout constraints

element-outside-viewport:
  explain outside viewport
  suggest responsive constraints

low-contrast/readability:
  explain foreground/background too close
  suggest adjust color tokens/theme contrast
```

### KPI

```txt
PASS nếu:
- Mỗi issue type có explanation và safe fix guidance.
- Không hứa auto-fix.
- Không dùng AI/OCR.
- Guidance hiển thị cùng evidence/selector/viewport.
```

---

## R8.10 — Auth / Flow Controls UI

### Mục tiêu

Dashboard có UI để dùng auth storageState và flow targets mà không phải sửa code thủ công.

UI auth tối thiểu:

```txt
Auth status
Start auth session
Clear auth state
Browser missing/auth error message
```

UI flow tối thiểu:

```txt
View configured targets/flows
Select flow targets to scan nếu có config source sạch
Show target kind/name/route
```

Nếu chưa có source configured flow targets:

```txt
- UI chỉ view scanned targets hoặc báo blocker rõ.
- Không fake target config từ latest report để scan mới.
```

### KPI

```txt
PASS nếu:
- User biết có auth state hay chưa.
- Start/clear auth hoạt động qua UI.
- Runtime scan có thể opt-in useSavedState.
- User chọn được configured flow target nếu source có.
- Không leak storageState/cookie/token/password.
```

# Stage 4 — Accuracy, Reliability, Safety

Stage này giúp sản phẩm đáng tin, không chỉ “chạy được”.

---

## R9.1 — Full Self-check Matrix

### Mục tiêu

Self-check phải cover đủ core.

Bắt buộc có:

```txt
path-policy self-check
production graph self-check
production graph HTTP self-check
production graph accuracy audit
runtime browser preflight self-check
runtime internal artifact validator self-check
runtime target model self-check
runtime scan self-check
DOM geometry self-check
viewport matrix self-check
state/flow execution self-check
layout issue detector self-check
runtime artifact repository self-check
contracts validators self-check
scan/report integration self-check
auth storageState self-check
UI adapter/navigation self-check
```

### KPI

```txt
PASS nếu:
- một command hoặc documented checklist chạy toàn bộ.
- không self-check nào phụ thuộc internet.
- không cần user browser thật ngoài Playwright-managed Chromium local.
- failure message đủ rõ để fix nhanh.
```

---

## R9.2 — Error Handling Hardening

### Mục tiêu

Tất cả lỗi quan trọng có code/message/action rõ.

Cần chuẩn hóa:

```txt
PATH_NOT_ALLOWED
WORKER_OFFLINE
BASE_URL_NOT_LOCAL
PLAYWRIGHT_BROWSER_MISSING
RUNTIME_SCAN_FAILED
TARGET_EXECUTION_ERROR
ARTIFACT_WRITE_FAILED
REPORT_INVALID
GRAPH_INVALID
AUTH_STATE_MISSING
AUTH_STATE_INVALID
AUTH_STATE_WRITE_FAILED
FLOW_STEP_FAILED
```

UI phải map lỗi sang message người dùng hiểu được.

### KPI

```txt
PASS nếu:
- không còn generic “failed” mơ hồ ở happy path quan trọng.
- lỗi known có remediation.
- không leak stack trace ra UI bình thường.
- auth/browser/path/local-only errors có message riêng.
```

---

## R9.3 — Performance Guardrails Finalization

### Mục tiêu

Hoàn thiện performance/safety guardrails. Basic guardrails đã phải có từ R6.1/R6.4, phase này là final audit và hardening.

Cần xác nhận/enforce:

```txt
max routes
max targets
max elements per viewport
timeout per route/target
timeout per scan
max screenshots
max text snippet length
max artifact size warning nếu làm được
flow step timeout
screenshot size behavior
```

### KPI

```txt
PASS nếu:
- large page không làm crash.
- route/target timeout được record.
- artifact không phình vô hạn.
- limits được document trong runbook/config.
- self-check hoặc stress fixture chứng minh guardrails hoạt động.
```

---

# Stage 5 — Packaging, Docs, Release

Stage này đóng gói sản phẩm production hoàn chỉnh.

---

## R10.1 — Runbook / Setup Docs

### Mục tiêu

Tạo docs chạy sản phẩm rõ ràng.

Docs cần có:

```txt
install dependencies
set project path
start worker
start UI
run production graph
run runtime scan
browser preflight / Playwright chromium install
configure route/target/flow scan
manual auth storageState flow
where artifacts are saved
common errors
```

Không được để docs mơ hồ kiểu “run app”.

---

## R10.2 — Demo Script

### Mục tiêu

Tạo demo script 3–5 phút.

Flow:

```txt
1. Open dashboard.
2. Select project.
3. Show production graph.
4. Run browser preflight if surfaced.
5. Run runtime scan.
6. Show DOM/layout issues.
7. Show target/viewport filtering.
8. Show report.
9. Show artifacts in .lutest.
10. Optional: show auth/manual flow on protected route.
```

---

## R10.3 — Release Audit

### Mục tiêu

Chỉ gọi là production complete nếu audit cuối pass.

Checklist:

```txt
typecheck pass
ui build pass
worker build pass
contracts build pass
validators pass
graph audit pass
runtime preflight self-check pass
runtime self-check pass
DOM geometry self-check pass
viewport matrix self-check pass
state/flow self-check pass
layout detector self-check pass
scan/report self-check pass
auth storageState self-check pass
no generated artifacts committed
AI_HANDOFF updated
docs/ai-context updated
known limitations honest
```

---

# Stage 6 — Legacy Backend Final Decision

Sau khi production runtime/report/UI đã ổn mới xử lý backend legacy cuối cùng.

---

## R11.1 — Legacy Backend Removal Audit

### Mục tiêu

Audit toàn bộ legacy backend graph.

Audit:

```txt
/api/graph
GraphResponse
graph.service.ts
graph.repository.ts
graph.mapper.ts
legacy adapters
lutestApi.getGraph()
```

Phân loại:

```txt
remove now
keep debug
move to archive
keep because contract compatibility
```

---

## R11.2 — Remove or Gate Legacy Backend

### Mục tiêu

Đưa legacy backend về trạng thái production-clean.

Có 2 lựa chọn production hợp lệ.

### Option A — Remove completely

Nếu không còn consumer:

```txt
xóa /api/graph
xóa GraphResponse nếu không còn dùng
xóa graph.service/repository/mapper legacy
xóa lutestApi.getGraph
update docs
```

### Option B — Gate debug endpoint

Nếu muốn giữ debug:

```txt
/api/graph chỉ bật khi LUTEST_ENABLE_LEGACY_GRAPH=true
default off
docs mark deprecated
```

### KPI

```txt
PASS nếu:
- production graph không bị ảnh hưởng.
- contracts không còn legacy nếu remove.
- tests pass.
- docs/context ghi rõ legacy backend status cuối cùng.
```

---

# Thứ tự thực thi

Không nhảy phase.

```txt
P0.1  — Baseline Lock

R6.0.2 — Runtime Browser Preflight
R6.1   — Runtime Internal Contracts, Limits & Artifact Shape
R6.2   — Runtime Artifact Repository Foundation
R6.3   — Runtime Target Model & Discovery Modes
R6.4   — DOM Geometry Foundation
R6.5   — Viewport Matrix
R6.6   — Manual State/Flow Execution
R6.7   — Runtime Layout Issue Engine
R6.8   — Runtime Artifact Repository Hardening

R7.1   — Public Runtime Contracts
R7.2   — Scan Service Integration
R7.3   — Latest Report Integration
R7.4   — Auth StorageState Integration

R8.1   — Dashboard Runtime Summary UI
R8.2   — Runtime Report UI
R8.3   — Screenshot / Evidence Viewer
R8.4   — Runtime Artifact Detail API & Evidence Model Hardening
R8.5   — Route / Target Selection Runtime Scan UI
R8.6   — Screenshot Overlay Evidence UI
R8.7   — Safe Interaction Discovery
R8.8   — Visual Readability / OKLCH Contrast Engine
R8.9   — Runtime Fix Guidance UI
R8.10  — Auth / Flow Controls UI

R9.1   — Full Self-check Matrix
R9.2   — Error Handling Hardening
R9.3   — Performance Guardrails Finalization

R10.1 — Runbook / Setup Docs
R10.2 — Demo Script
R10.3 — Release Audit

R11.1 — Legacy Backend Removal Audit
R11.2 — Remove or Gate Legacy Backend
```

---

# Production Complete vs Production Clean Complete

## Production Complete

Có thể gọi là **Production Complete** khi xong đến:

```txt
R10.3 — Release Audit
```

Lúc này sản phẩm lõi đã hoàn chỉnh.

## Production Clean Complete

Gọi là **Production Clean Complete** khi xong thêm:

```txt
R11.2 — Remove or Gate Legacy Backend
```

Lúc này sản phẩm không chỉ hoàn chỉnh mà còn sạch legacy backend.

---

# KPI cuối cùng của toàn dự án

Dự án chỉ được coi là hoàn chỉnh nếu đạt đủ:

## Architecture

```txt
- Production graph là primary.
- Runtime scan là first-class production feature.
- Runtime target model hỗ trợ route/state/flow.
- Report pipeline là source-of-truth.
- Auth storageState hỗ trợ app cần login.
- Legacy backend removed hoặc gated debug-only.
```

## Security / Safety

```txt
- Path-policy strict.
- External baseUrl blocked.
- Artifacts chỉ trong selected project root.
- No secrets in artifacts/logs/UI.
- storageState không bị log/commit.
- No generated artifacts committed.
```

## Contracts

```txt
- Internal runtime artifact shape rõ.
- Public runtime contracts rõ.
- Validators pass.
- API shape documented.
- No loose any.
```

## Artifacts

```txt
- Production graph artifact.
- Runtime scan artifact.
- Report artifact.
- Auth storageState artifact có clear/status.
- Metadata files rõ.
```

## UI

```txt
- Graph page production-only.
- Scan controls usable.
- Target/flow selection usable.
- Auth status/start/clear usable.
- Report issues readable.
- Error/loading/empty states rõ.
```

## Testing

```txt
- Typecheck/build pass.
- Graph audit pass.
- Browser preflight self-check pass.
- Runtime self-check pass.
- DOM geometry self-check pass.
- Viewport matrix self-check pass.
- State/flow self-check pass.
- Layout issue detector self-check pass.
- Scan/report integration self-check pass.
- Auth storageState self-check pass.
- UI adapter/navigation self-check pass.
```

## Docs

```txt
- Runbook.
- Demo script.
- Known limitations.
- AI_HANDOFF/context updated.
```

---

# Output format bắt buộc cho mỗi phase

Mỗi phase phải kết thúc bằng report theo format:

```txt
Phase completed:
Changed files:
Architecture decisions:
Data/contracts changed:
Artifact paths:
Validation/self-checks:
Tests run:
What was not changed:
Known limitations:
Docs/context updated:
Next phase:
```

Nếu thiếu `Tests run`, thiếu `Known limitations`, hoặc ghi mơ hồ “all tests pass” thì phase chưa đạt.

---

# Guardrail cho AI agent

Thêm vào mọi prompt phase:

```txt
Đây là implementation command cho đúng phase được nêu.
Chỉ làm đúng scope phase này.
Không làm phase sau.
Không tạo giải pháp tạm với lý do sẽ refactor sau.
Không đổi API/contracts nếu phase chưa yêu cầu rõ.
Không nới path-policy.
Không hardcode máy local.
Không bịa test pass.
Không auto-click destructive actions nếu user/config không khai báo rõ.
Không log cookie/token/password/storageState raw.
Nếu gặp điểm không chắc, dừng lại, báo rủi ro và đề xuất thiết kế đúng.
```

---

# Ghi chú về scope sau Production Clean Complete

Sau khi xong `R11.2`, các việc sau là **feature mở rộng**, không phải phần thiếu của sản phẩm lõi:

```txt
R12+ form-aware interaction testing / test data profiles
R12+ manual flow builder UI
AI auto-fix suggestion
visual diff
accessibility engine nâng cao
CI integration
GitHub app
cloud dashboard
team workspace
historical trend report
plugin system
paid license/commercial packaging
```

Không được dùng các feature mở rộng này làm lý do để gọi Production Clean Complete là chưa hoàn chỉnh.
