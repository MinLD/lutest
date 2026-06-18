# TLX - Roadmap 8 Tuần Xây Lại Từ Đầu

Date: 2026-06-18

## 0. Mục tiêu của roadmap này

Roadmap này được viết để phục vụ đúng nhu cầu sau:

- nhìn vào từng tuần là biết tuần đó phải làm gì
- nhìn vào từng giai đoạn trong tuần là biết phải setup gì, code gì, test gì
- ưu tiên tính thực tế, không ôm đồm
- bám đúng hướng kiến trúc đã chốt:
  - **Node.js host CLI**
  - **Node.js + Express worker**
  - **TypeScript**
  - **UI local dashboard**
  - **local-first**   
- mục tiêu trong 8 tuần là tạo ra một bản TLX có thể:
  - chạy bằng `tlx`
  - khởi động worker ổn định
  - quét project local
  - dựng graph cơ bản
  - chạy visual scan cơ bản
  - lưu report/screenshots vào `.tlx/`
  - mở dashboard và xem kết quả thật
  - có nền sẵn để mở rộng các phase sản phẩm sau này

---

# PHẦN 1: TỔNG QUAN LỘ TRÌNH (8 TUẦN)

## Tuần 1 - Chốt nền tảng và dựng skeleton dự án
**Mục tiêu chính:** dọn hướng cũ, chốt kiến trúc mới, tạo monorepo sạch, thiết lập Node host CLI + Node worker + contracts + scripts cơ bản.

## Tuần 2 - Hoàn thiện Host CLI và lifecycle nền tảng
**Mục tiêu chính:** làm cho `tlx` chạy được, đọc config được, spawn worker được, health check được, shutdown sạch.

## Tuần 3 - Hoàn thiện Worker nền tảng và local API
**Mục tiêu chính:** worker Express chạy độc lập, có route status/project/graph placeholder, có static dashboard serving, có runtime config sạch.

## Tuần 4 - Framework detection + project reading + graph extraction bản đầu
**Mục tiêu chính:** đọc project thật, nhận diện framework cơ bản, parse source ở mức đủ dùng, tạo graph pages/components/apis sơ bộ.

## Tuần 5 - Scan engine + Playwright + report local
**Mục tiêu chính:** thực hiện scan thật trên project local, tạo `.tlx/latest-report.json`, chụp screenshot, sinh bug/report data thật.

## Tuần 6 - Dashboard thật + cache diff + auth/manual flow
**Mục tiêu chính:** dashboard đọc dữ liệu thật, có cache diff cơ bản, có auth/manual login flow tối thiểu, UX đủ để demo.

## Tuần 7 - Hardening + cross-platform + sửa lỗi + docs
**Mục tiêu chính:** dọn bug, ổn định flow Windows/Linux, chuẩn hóa logs/messages, viết docs vận hành, test lại end-to-end.

## Tuần 8 - Buffer Week + polish + demo release
**Mục tiêu chính:** hấp thụ trễ tiến độ, sửa lỗi còn sót, polish dashboard/report, chốt bản demo usable.

---

# PHẦN 2: KẾ HOẠCH CHI TIẾT TỪNG TUẦN (ACTIONABLE ITEMS)

---

## TUẦN 1 - CHỐT NỀN TẢNG VÀ DỰNG SKELETON

### Mục tiêu tuần
- tạo lại cấu trúc dự án sạch
- chốt tooling
- tạo workspace chạy được
- chưa làm feature scan thật
- ưu tiên “dự án có khung xương tốt”

### Đầu tuần

#### Setup / Architecture
- Chốt package manager JS:
  - ưu tiên `npm` hoặc `pnpm`
  - **không** lấy Bun làm runtime chính
- Tạo lại cấu trúc thư mục:
  - `apps/cli-host`
  - `apps/worker-node`
  - `apps/ui`
  - `packages/contracts`
  - `docs/plan`
- Tạo package Node host trong `apps/cli-host`
- Tạo root `package.json`
- Tạo workspace config cho `apps/*` và `packages/*`
- Chốt Node version dùng cho toàn dự án
- Chốt TS config base dùng chung

#### Development
- Tạo Node host entrypoint tối thiểu:
  - `apps/cli-host/src/main.ts`
- Tạo worker entrypoint tối thiểu:
  - `apps/worker-node/src/main.ts`
- Tạo `packages/contracts` tối thiểu:
  - `api.ts`
  - `graph.ts`
  - `report.ts`
- Tạo root scripts:
  - `dev`
  - `build`
  - `test`
  - `typecheck`
  - `lint`

#### Testing / Debug
- Xác nhận:
  - `npm install` hoặc `pnpm install` chạy được
  - `npm run typecheck` không lỗi cấu hình
- Test bootstrap:
  - import package contracts từ worker được
  - build TypeScript worker không lỗi

---

### Giữa tuần

#### Setup / Architecture
- Tạo `.editorconfig`
- Tạo `eslint` / `typescript-eslint`
- Tạo `prettier` nếu dùng
- Tạo quy ước environment:
  - `.env.example`
  - `tlx.yaml.example`

#### Development
- Tạo cấu trúc config model ban đầu:
  - project path
  - target URL
  - worker port
  - open browser
  - start target flag
- Tạo config loader trong Node host
- Tạo worker runtime config loader tối thiểu

#### Testing / Debug
- Test đọc config mock từ env
- Test parse file config mẫu
- Xác nhận config default không crash khi thiếu file

---

### Cuối tuần

#### Setup / Architecture
- Chốt naming convention:
  - package names
  - folder names
  - env names
  - route names
- Chốt nguyên tắc output/logging

#### Development
- Viết README khởi tạo dự án:
  - cách cài
  - cách chạy dev
  - cách build
- Viết docs ngắn cho structure

#### Testing / Debug
- Checklist cuối tuần:
  - repo bootstrap sạch
  - scripts chạy được
  - Node host build được
  - worker build được
  - contracts import được
- Không qua tuần 2 nếu:
  - workspace còn lỗi
  - build chưa ổn
  - config structure chưa chốt

### Deliverables cuối Tuần 1
- monorepo sạch
- Node host skeleton
- Node worker skeleton
- contracts package
- scripts chuẩn
- config mẫu
- README bootstrap

---

## TUẦN 2 - HOST CLI VÀ LIFECYCLE NỀN TẢNG

### Mục tiêu tuần
- `tlx` phải chạy được
- host phải đọc config được
- host phải spawn worker được
- host phải shutdown sạch

### Đầu tuần

#### Setup / Architecture
- Chọn cách build/chạy Node CLI:
  - `tsx` cho dev
  - `tsc` cho build
- Chọn logging Node:
  - console trước, có thể nâng cấp `pino` sau
- Chốt format config merge:
  - defaults
  - `.env`
  - `tlx.yaml`
  - env override

#### Development
- Tạo command `tlx`
- Tạo root command và flags cơ bản
- Tạo config loading pipeline
- Tạo struct config chuẩn:
  - project path
  - target URL
  - port
  - open browser
  - worker command
  - log level

#### Testing / Debug
- Test CLI:
  - `tlx --help`
  - `tlx version`
- Unit test config parser:
  - env only
  - yaml only
  - env override yaml

---

### Giữa tuần

#### Setup / Architecture
- Thiết kế module trong `apps/cli-host/src`:
  - process manager
  - health checker
  - config loader
- Chốt cơ chế spawn worker:
  - `node:child_process`
  - stdout/stderr riêng
  - timeout startup

#### Development
- Viết worker process manager:
  - start worker
  - capture PID
  - stop worker
- Viết health polling:
  - ping `/api/status`
  - timeout 10-30 giây
- Viết logging host:
  - starting worker
  - worker ready
  - worker failed
  - config errors

#### Testing / Debug
- Test case:
  - worker command sai
  - port đã bị chiếm
  - worker không trả health
  - project path không tồn tại
- Đảm bảo lỗi in ra dễ hiểu

---

### Cuối tuần

#### Setup / Architecture
- Chốt signal handling:
  - Ctrl+C
  - graceful shutdown
  - cleanup child process

#### Development
- Viết signal handler
- Viết auto-open browser option
- Viết output message rõ:
  - dashboard URL
  - project path
  - target URL
- Viết docs cho host lifecycle

#### Testing / Debug
- Manual test:
  - start host
  - worker start
  - Ctrl+C
  - worker bị kill sạch
- Test trên Windows path có khoảng trắng
- Test nhiều lần start/stop liên tiếp

### Deliverables cuối Tuần 2
- `tlx` chạy được
- host đọc config được
- host spawn worker được
- host health check được
- host shutdown sạch

---

## TUẦN 3 - WORKER NỀN TẢNG VÀ LOCAL API

### Mục tiêu tuần
- worker Express chạy độc lập
- có API local tối thiểu
- có static dashboard serving
- không phụ thuộc `process.cwd()` nguy hiểm

### Đầu tuần

#### Setup / Architecture
- Chọn stack worker:
  - `express`
  - `zod`
  - `pino`
- Chốt route structure:
  - `/api/status`
  - `/api/project`
  - `/api/graph`
  - `/api/report/latest`
- Chốt middleware cơ bản:
  - request logger
  - error handler
  - not found handler

#### Development
- Tạo Express app
- Tạo bootstrap server
- Tạo route `/api/status`
- Tạo route `/api/project` placeholder
- Tạo route `/api/graph` placeholder

#### Testing / Debug
- Test worker standalone:
  - chạy độc lập không qua host
  - curl được `/api/status`
  - curl được `/api/project`

---

### Giữa tuần

#### Setup / Architecture
- Chốt runtime path resolution:
  - root dir
  - project dir
  - static assets dir
  - `.tlx/` dir
- Tách config của worker ra riêng

#### Development
- Viết helper resolve path an toàn
- Viết project metadata reader cơ bản
- Viết dashboard static serve
- Nối route `/api/project` với metadata thật:
  - project path
  - detected package presence
  - basic summary

#### Testing / Debug
- Test các case:
  - project không có `package.json`
  - project là PHP
  - project path relative/absolute
  - static file missing

---

### Cuối tuần

#### Setup / Architecture
- Chốt error response schema
- Chốt status response schema trong contracts

#### Development
- Tạo `packages/contracts` cho:
  - `StatusResponse`
  - `ProjectSummary`
  - `GraphResponse`
- Đồng bộ host/worker types nếu cần
- Làm route `/api/graph` trả data mock đúng schema

#### Testing / Debug
- Typecheck toàn workspace
- Test host gọi worker thật
- Kiểm tra logs không rác, không in quá nhiều

### Deliverables cuối Tuần 3
- worker Express ổn định
- route local API cơ bản hoạt động
- static dashboard serve được
- path resolution sạch

---

## TUẦN 4 - FRAMEWORK DETECTION VÀ GRAPH EXTRACTION BẢN ĐẦU

### Mục tiêu tuần
- worker đọc được project thật
- detect framework cơ bản
- build graph sơ bộ
- chuẩn bị dữ liệu scan

### Đầu tuần

#### Setup / Architecture
- Chốt danh sách framework hỗ trợ phase đầu:
  - Next.js
  - React/Vite
  - Vue/Vite
  - Laravel
  - PHP thường
  - Unknown
- Chốt output schema cho framework detection

#### Development
- Viết detector:
  - đọc `package.json`
  - đọc các file config thường gặp
  - đọc folder conventions
- Tạo `FrameworkInfo`
- Nối `/api/project` để trả framework thật

#### Testing / Debug
- Tạo fixture projects mẫu:
  - next fixture
  - vite fixture
  - laravel fixture
  - php fixture
- Test detector trên fixture

---

### Giữa tuần

#### Setup / Architecture
- Chốt scope graph phase đầu:
  - pages/routes
  - components
  - API calls
  - imports chính
- Chưa cố parse hoàn hảo mọi syntax

#### Development
- Viết file collector
- Viết module graph builder bản đầu
- Đọc source files theo whitelist extensions
- Sinh nodes:
  - page node
  - component node
  - api node
- Sinh edges import/use/call ở mức cơ bản

#### Testing / Debug
- Test trên fixture
- Test graph output không bị empty vô lý
- Debug case project lớn

---

### Cuối tuần

#### Setup / Architecture
- Chốt cache model ban đầu để dùng tuần 5-6:
  - hash file
  - graph snapshot
  - changed files

#### Development
- Nối route `/api/graph` với graph thật
- Ghi graph snapshot vào `.tlx/graph/`
- Tạo helper ghi `.tlx/` nếu chưa có

#### Testing / Debug
- Manual test trên 1 project thật
- Verify:
  - framework detect đúng
  - graph có dữ liệu
  - `.tlx/` được tạo đúng
- Không qua tuần 5 nếu graph chưa ra data usable

### Deliverables cuối Tuần 4
- framework detection dùng được
- graph extraction cơ bản dùng được
- route graph trả dữ liệu thật
- `.tlx/` bắt đầu có dữ liệu local

---

## TUẦN 5 - SCAN ENGINE + PLAYWRIGHT + REPORT LOCAL

### Mục tiêu tuần
- chạy scan thật
- chụp screenshot thật
- sinh report thật
- lưu kết quả vào `.tlx/`

### Đầu tuần

#### Setup / Architecture
- Cài thư viện:
  - `playwright`
- Chốt scan modes phase đầu:
  - `all`
  - `changed`
  - `single route`
- Chốt report schema:
  - success
  - scanScope
  - routesScanned
  - bugsFound
  - screenshots
  - timestamp

#### Development
- Tạo scan action route:
  - `POST /api/actions/scan`
- Viết scan orchestrator
- Viết logic chọn routes từ graph
- Viết basic target navigation bằng Playwright

#### Testing / Debug
- Test scan trên project local đang chạy
- Test timeout khi target URL chết
- Test lỗi browser chưa cài

---

### Giữa tuần

#### Setup / Architecture
- Chốt visual checks phase đầu:
  - overlap
  - overflow
  - text clipping
  - low contrast
- Chưa cố làm quá nhiều heuristic

#### Development
- Viết DOM scanner cơ bản
- Viết AABB overlap check cơ bản
- Viết contrast ratio check cơ bản
- Chụp screenshot route-level
- Tạo `Bug` objects theo contracts

#### Testing / Debug
- Test trên 2-3 page thật
- Xác minh:
  - có bug output
  - không false positive quá vô lý
  - screenshot file tồn tại

---

### Cuối tuần

#### Setup / Architecture
- Chốt output local:
  - `.tlx/latest-report.json`
  - `.tlx/hash.json`
  - `.tlx/screenshots/`

#### Development
- Viết report writer
- Viết screenshot store
- Viết hash store bản đầu
- Nối route report latest

#### Testing / Debug
- Manual checklist:
  - scan xong có report
  - report JSON valid
  - screenshot path đúng
  - dashboard đọc được file
- Regression test:
  - scan project không auth
  - scan route đơn
  - scan full project nhỏ

### Deliverables cuối Tuần 5
- scan engine hoạt động
- Playwright chạy thật
- report local được tạo
- screenshot được lưu
- route report latest hoạt động

---

## TUẦN 6 - DASHBOARD THẬT + CACHE DIFF + AUTH FLOW

### Mục tiêu tuần
- dashboard không còn mock
- có cache diff cơ bản
- có auth/manual flow
- có thể dùng để demo thật

### Đầu tuần

#### Setup / Architecture
- Chốt các view tối thiểu:
  - Overview
  - Project Map
  - Latest Report
  - Bugs
  - Auth
  - Cache Diff
- Chốt data fetching layer cho UI

#### Development
- Nối UI vào API thật:
  - `/api/project`
  - `/api/graph`
  - `/api/report/latest`
- Tạo Overview page
- Tạo Latest Report page
- Tạo Bugs list page

#### Testing / Debug
- Test loading/error state
- Test dashboard khi chưa có report
- Test dashboard khi report lỗi/malformed

---

### Giữa tuần

#### Setup / Architecture
- Chốt cache diff logic:
  - hash previous
  - hash current
  - changed files
  - affected nodes

#### Development
- Viết diff service
- Tạo route `/api/cache/diff`
- Tạo UI cache diff
- Hiển thị:
  - changed files
  - affected pages/components
  - suggested routes retest

#### Testing / Debug
- Sửa 1 file trong project thật
- Re-scan
- Verify diff có phản ứng hợp lý
- Đảm bảo full fallback khi hash lỗi

---

### Cuối tuần

#### Setup / Architecture
- Chốt auth/manual flow tối thiểu:
  - open browser
  - login tay
  - save storage state
  - clear auth
- Chốt location lưu auth local

#### Development
- Tạo route:
  - `POST /api/actions/auth/start`
  - `POST /api/actions/auth/clear`
  - `GET /api/auth/status`
- Viết auth state store
- UI auth status cơ bản
- Nối scan để dùng session nếu có

#### Testing / Debug
- Test flow:
  - start auth
  - login tay
  - save session
  - scan lại dùng session
  - clear auth
- Test session file path đúng
- Không qua tuần 7 nếu dashboard còn phụ thuộc mock

### Deliverables cuối Tuần 6
- dashboard hiển thị data thật
- cache diff dùng được
- auth/manual flow cơ bản dùng được
- demo local flow gần hoàn chỉnh

---

## TUẦN 7 - HARDENING, CROSS-PLATFORM, TEST VÀ DOCS

### Mục tiêu tuần
- biến hệ thống từ “chạy được” thành “ổn định để giao tiếp/demo”
- xử lý bug tích lũy
- test Windows/Linux sớm
- hoàn thiện docs chạy dự án

### Đầu tuần

#### Setup / Architecture
- Tạo bug list theo nhóm:
  - startup
  - config
  - worker lifecycle
  - scan
  - dashboard
  - auth
  - path/OS
- Chốt test matrix:
  - Windows
  - Linux
  - project không auth
  - project có auth
  - project Node
  - project PHP

#### Development
- Sửa các lỗi startup/lifecycle trước
- Chuẩn hóa log messages
- Chuẩn hóa error messages
- Dọn dead code / TODO rác

#### Testing / Debug
- Regression host:
  - nhiều lần start/stop
  - config lỗi
  - port conflict
- Regression worker:
  - status
  - graph
  - report
  - auth

---

### Giữa tuần

#### Setup / Architecture
- Chốt docs người dùng:
  - cách cài
  - cách chạy
  - cách scan
  - cách auth
  - cách debug lỗi
- Chốt docs developer:
  - structure
  - scripts
  - local flow
  - release flow

#### Development
- Viết `README.md`
- Viết docs setup
- Viết docs config
- Viết docs manual test checklist

#### Testing / Debug
- Dùng docs vừa viết để setup lại từ máy sạch hoặc terminal mới
- Sửa mọi bước docs bị thiếu

---

### Cuối tuần

#### Setup / Architecture
- Chốt acceptance checklist bản demo
- Chốt feature nào defer sang phase sau

#### Development
- Tối ưu UX dashboard nhẹ:
  - labels
  - empty states
  - errors
  - buttons
- Chốt version demo milestone

#### Testing / Debug
- End-to-end test đầy đủ:
  1. chạy `tlx`
  2. worker healthy
  3. mở dashboard
  4. scan project
  5. xem graph
  6. xem bugs
  7. xem screenshots
  8. auth flow nếu cần
- Lưu bug backlog cho Tuần 8

### Deliverables cuối Tuần 7
- flow local ổn định hơn rõ rệt
- docs usable
- bug list rõ
- đủ cơ sở để polish/release demo

---

## TUẦN 8 - BUFFER WEEK + POLISH + DEMO RELEASE

### Mục tiêu tuần
- hấp thụ chậm tiến độ
- sửa các bug khó còn sót
- polish bản demo
- chốt “đủ tốt để dùng và trình bày”

### Vì sao đặt buffer ở Tuần 8
Đây là thời điểm hợp lý nhất vì:
- tuần 1-6 là thời gian build lõi
- tuần 7 mới lộ ra bug hệ thống thật
- nếu đặt buffer quá sớm thì thường bị tiêu vào việc chưa đủ dữ liệu
- buffer cuối giúp hấp thụ rủi ro từ scan/auth/dashboard/cross-platform

### Đầu tuần

#### Setup / Architecture
- Review backlog bug từ tuần 7
- Phân loại:
  - blocker
  - important
  - nice-to-have
- Cắt bỏ các mục không cần cho demo

#### Development
- Fix blocker bugs
- Fix scan reliability bugs
- Fix dashboard rendering bugs
- Fix auth/session bugs

#### Testing / Debug
- Re-test từng bug sau khi fix
- Không mở thêm feature mới nếu không thật sự cần

---

### Giữa tuần

#### Setup / Architecture
- Chốt bản demo:
  - feature giữ lại
  - feature defer
- Chốt tiêu chí “release được”

#### Development
- Polish dashboard:
  - summary cards
  - bug severity
  - screenshot preview
- Polish CLI output:
  - startup message
  - scan progress
  - errors dễ hiểu

#### Testing / Debug
- Test trên ít nhất 2 project thật
- Test on/off auth
- Test with changed scan

---

### Cuối tuần

#### Setup / Architecture
- Tạo release notes nội bộ
- Tạo danh sách phase sau:
  - mở rộng graph
  - cải tiến scan
  - nâng cấp dashboard
  - thêm automation

#### Development
- Final cleanup
- Tag milestone nếu dùng git
- Chốt docs demo/handoff

#### Testing / Debug
- Final demo checklist:
  - `tlx` chạy được
  - host spawn worker ổn
  - project detect đúng
  - graph có data
  - scan có report
  - screenshot có thật
  - dashboard đọc data đúng
  - auth flow dùng được nếu cần

### Deliverables cuối Tuần 8
- bản demo usable
- docs đủ dùng
- backlog phase sau rõ ràng
- nền sẵn để phát triển các phase tiếp theo của sản phẩm

---

# PHẦN 3: CHIẾN LƯỢC QUẢN LÝ RỦI RO & QUẢN LÝ THỜI GIAN

## 1. Các “bẫy công nghệ” dễ gặp và cách né

### Bẫy 1: Ôm lại code cũ quá nhiều
**Dấu hiệu:**
- copy nguyên module cũ sang
- sửa vá tạm để “chạy trước”
- folder structure bị lai giữa kiến trúc cũ và mới

**Cách né:**
- chỉ reuse ý tưởng, không reuse bừa implementation
- nếu module cũ không fit Node host + Express worker thì viết lại
- tuần 1 phải chốt structure sạch

---

### Bẫy 2: Làm dashboard quá sớm
**Dấu hiệu:**
- UI đẹp nhưng API mock
- graph/report chưa ổn mà đã tối ưu giao diện

**Cách né:**
- chỉ làm UI thật sau khi:
  - worker API có data thật
  - graph có output thật
  - report có file thật
- dashboard chỉ được polish mạnh từ tuần 6 trở đi

---

### Bẫy 3: Phụ thuộc Bun runtime
**Dấu hiệu:**
- scripts chạy được chỉ nhờ Bun
- Playwright/hệ sinh thái lệch Node
- deploy/build docs khó cho người khác

**Cách né:**
- Node là runtime chính
- Bun chỉ optional
- test toàn bộ scripts bằng Node/npm hoặc pnpm

---

### Bẫy 4: Dùng `process.cwd()` bừa bãi trong worker
**Dấu hiệu:**
- chạy chỗ này được, chỗ khác fail
- path static hoặc `.tlx/` sai khi gọi qua host

**Cách né:**
- tuần 3 phải chốt path resolver
- phân biệt rõ:
  - repo root
  - project target root
  - worker dist root
  - storage root

---

### Bẫy 5: Scan engine quá tham vọng
**Dấu hiệu:**
- muốn parse hoàn hảo mọi framework
- muốn visual detection “thông minh” từ đầu
- tuần 5 vẫn còn sửa parser cơ bản

**Cách né:**
- phase đầu chỉ cần:
  - detect đúng phần lớn
  - graph usable
  - bug heuristics cơ bản
- ưu tiên correctness vừa đủ + output usable

---

### Bẫy 6: Không test Windows sớm
**Dấu hiệu:**
- path separator lỗi
- worker command lỗi
- signal handling khác Linux

**Cách né:**
- test Windows ngay từ tuần 2, 3, 5, 7
- mọi helper path dùng `path`
- process lifecycle không assume shell Unix

---

### Bẫy 7: Auth flow làm muộn nhưng lệ thuộc scan
**Dấu hiệu:**
- tới tuần demo mới phát hiện app cần login
- scan route protected bị fail toàn bộ

**Cách né:**
- tuần 5 xác định sớm target nào cần auth
- tuần 6 phải có manual login tối thiểu

---

### Bẫy 8: Report schema đổi liên tục
**Dấu hiệu:**
- worker trả field lúc có lúc không
- dashboard phải vá mapping nhiều nơi

**Cách né:**
- contracts phải chốt từ tuần 3-5
- thay đổi schema phải sửa đồng bộ package contracts

---

### Bẫy 9: Không cắt scope đúng lúc
**Dấu hiệu:**
- bắt đầu đụng thêm phase mới quá sớm
- tuần 6 vẫn chưa xong local scan nhưng đã nghĩ feature mở rộng

**Cách né:**
- 8 tuần này ưu tiên local core
- các phase mở rộng chỉ để backlog/phase sau
- chỉ giữ trong docs và architecture, chưa build thật nếu chưa đủ thời gian

---

## 2. Buffer Week nên đặt lúc nào?

### Đề xuất
**Tuần 8 là Buffer Week chính.**

### Lý do
- Sau tuần 5-6 mới lộ nhiều bug thật vì đã có scan, dashboard, auth.
- Sau tuần 7 sẽ có bug cross-platform và bug flow thực tế.
- Tuần 8 giúp tránh việc “đóng dự án trong trạng thái gần xong nhưng không usable”.

### Nếu tiến độ bị chậm sớm
Nếu đến cuối tuần 4 mà:
- host/worker còn chưa ổn
- graph chưa usable
- project detect chưa đáng tin

thì cần xử lý như sau:
- biến **nửa đầu tuần 5** thành mini-buffer
- cắt scope visual checks nâng cao
- giữ lại:
  - detect framework
  - graph
  - scan all
  - report latest
  - dashboard latest report
- dời:
  - auth nâng cao
  - cache diff nâng cao
  - report history
  - polish UI

---

## 3. Cách quản lý thời gian thực tế trong 8 tuần

### Nguyên tắc 1: Mỗi tuần chỉ có 1 mục tiêu chính
Không để một tuần gánh cả:
- setup lớn
- feature lớn
- polish lớn
- docs lớn

Mỗi tuần chỉ nên có **1 đầu ra chính**.

### Nguyên tắc 2: Luôn chốt “Definition of Done” cuối tuần
Ví dụ:
- tuần 2 xong nghĩa là `tlx` phải spawn worker thật
- tuần 5 xong nghĩa là phải có report thật

Không dùng “đã code được một phần” làm thước đo.

### Nguyên tắc 3: Không qua feature mới khi nền cũ chưa ổn
- host chưa ổn => chưa mở rộng scan
- scan chưa ổn => chưa polish dashboard
- dashboard còn mock => chưa gọi là xong

### Nguyên tắc 4: Mỗi cuối tuần phải có 1 buổi review ngắn
Checklist review:
- tuần này output gì đã chạy thật?
- phần nào mới chỉ là code nhưng chưa chứng minh?
- bug nào chặn tuần sau?
- có cần cắt scope không?

### Nguyên tắc 5: Giữ backlog “không làm ngay”
Tạo riêng 3 cột:
- **Now**
- **Next**
- **Later**

Đừng để ý tưởng các phase mở rộng làm loãng 8 tuần local core.

---

## 4. Scope cắt giảm nếu bị chậm tiến độ

Nếu đến giữa tuần 6 bị chậm, cắt theo thứ tự sau:

### Cắt trước
- report history
- visual heuristics nâng cao
- graph quá chi tiết
- UI polish nhiều hiệu ứng

### Giữ lại bắt buộc
- `tlx`
- host/worker lifecycle
- framework detect cơ bản
- graph cơ bản
- scan thật
- latest report
- screenshots
- dashboard đọc data thật

### Cắt sau cùng
- auth manual flow
- cache diff
- bugs severity nâng cao

---

## 5. Kết quả kỳ vọng sau 8 tuần

Nếu bám đúng roadmap này, cuối 8 tuần bạn nên có:

- một TLX chạy được bằng `tlx`
- Node host ổn định
- worker Express ổn định
- framework detection cơ bản
- graph extraction cơ bản
- Playwright scan chạy thật
- report + screenshot local
- dashboard local xem được kết quả thật
- docs đủ để người khác chạy lại
- nền kiến trúc sạch để bước sang phase mở rộng tiếp theo

---

## 6. Kết luận

Roadmap này không cố làm TLX “đủ mọi thứ” trong 8 tuần.

Nó tập trung vào một mục tiêu thực tế hơn:

1. dựng lại nền sạch  
2. hoàn thiện local core usable  
3. chứng minh scan/report/dashboard hoạt động thật  
4. chuẩn bị sẵn mặt bằng cho các phase mở rộng sau đó  

Nếu làm đúng nhịp, đến cuối 2 tháng bạn sẽ không chỉ có “một repo đang code”, mà sẽ có **một sản phẩm cá nhân chạy được, demo được, và có nền kỹ thuật đủ tốt để phát triển tiếp**.