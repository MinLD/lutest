# Production Refactor Progress

Updated: 2026-06-30
Phase: R0 — docs + audit only
Status: In Progress

## 1. Current MVP checkpoint

MVP checkpoint accepted:
The old MVP path stops at source scanning + project detection + file-level graph counting.
From this point forward, graph counting must be upgraded into production AST symbol graph.

Current checkpoint:
- Monorepo exists with `apps/cli-host`, `apps/worker-node`, `packages/contracts`.
- Express worker exists and mounts status/project/graph/report/scan modules.
- Project discovery exists and counts source files.
- Scan route exists and writes reports.
- Graph v1 exists and persists latest graph.
- Graph still centers on file nodes and file-level counts.
- Report/latest pipeline exists with missing/malformed/schema-invalid states.

## 2. Old plan status

Required doc paths from prompt are not present under `docs/plan`:
- missing: `docs/plan/master-srs-context.md`
- missing: `docs/plan/master-srs-production.md`
- missing: `docs/plan/production-implementation-roadmap.md`
- missing: `docs/plan/api-contract-production.md`
- missing: `docs/plan/graph-ast-symbol-design.md`
- missing: `docs/plan/production-test-fixtures-plan.md`
- missing: `docs/plan/migration-plan-from-mvp-to-production.md`
- missing: `docs/plan/zero-debt-audit-roadmap.md`
- missing: `docs/plan/project-progress-total-timeline.md`

Equivalent docs found and read:
- `docs/plant_new/master-srs-production.md`
- `docs/plant_new/production-implementation-roadmap.md`
- `docs/plant_new/api-contract-production.md`
- `docs/plant_new/graph-ast-symbol-design.md`
- `docs/plant_new/migration-plan-from-mvp-to-production.md`
- `docs/plan_old/zero-debt-audit-roadmap.md`
- `docs/plan_old/project-progress-total-timeline.md`

Important missing production doc:
- `production-test-fixtures-plan.md` was not found under `docs/plant_new`, `docs/plan_old`, or `docs/plan`.

Old MVP status:
- Good base modules exist.
- Production docs say production value must move from vanity counts to semantic graph, route discovery, coverage, issue mapping, report integrity, and deterministic CLI lifecycle.
- R0 stops before feature code.

## 3. New production plan target

Target path:
- R1: API route naming + runtime validation alignment.
- R2: path security policy + allowed roots.
- R3: report schema integrity + atomic writes.
- R4: production graph contract.
- R5: AST symbol graph + import resolver.
- R6: production fixtures + regression tests.
- R7: CLI production lifecycle.
- R8: UI migration after backend contracts stabilize.

Explicitly not doing before R1-R6 pass:
- Playwright browser automation.
- Screenshot capture.
- DOM bounding boxes.
- AABB overlap checks.
- Contrast checks.
- Auth manual flow.
- Cache diff.
- NPM publish.
- UI animation/polish.

## 4. Gap list

### API route naming

- `apps/worker-node/src/app.ts:32` mounts scan at `/api/scan`.
- `apps/worker-node/src/modules/scan/scan.routes.ts:6` exposes `POST /` under that mount.
- Production contract expects action route `POST /api/actions/scan`.
- Current route can keep legacy alias during migration, but production route is absent.

### Runtime API validation

- `apps/worker-node/src/modules/scan/scan.controller.ts:18` calls `validateScanRequest`, good start.
- `packages/contracts/src/index.ts:184` validates `ScanRequest` with only `projectPath`.
- `packages/contracts/src/index.ts:299` validates `ScanResponse` shallowly only; nested `project`, `issues`, `reportPath` safety are not fully validated.
- `packages/contracts/src/index.ts:294` returns `value as unknown as LatestReportResponse`.
- `packages/contracts/src/index.ts:349` returns `value as unknown as ScanResponse`.
- These casts bypass real contract construction and should be removed in production validation.

### Path security policy

- `apps/worker-node/src/modules/scan/scan.controller.ts:26` checks `pathPolicyService.assertProjectRoot` only when request has `projectPath`.
- `apps/worker-node/src/shared/services/path-policy.service.ts:23` uses `path.resolve(rawPath)` and does not require absolute input.
- `apps/worker-node/src/shared/services/path-policy.service.ts:25` blocks generated segments but does not enforce configured allowed roots.
- `apps/worker-node/src/shared/services/path.service.ts:82` defines allowed roots.
- `apps/worker-node/src/shared/services/path.service.ts:94` defines `assertAllowedRoot`.
- `apps/worker-node/src/shared/services/path.service.ts:136` resolves paths but never calls `getAllowedRoots` or `assertAllowedRoot`; allowed-root policy is dead code.
- `apps/worker-node/src/shared/services/path.service.ts:149` exposes strict result but still lacks allowed-root enforcement.

### Report schema integrity

- `apps/worker-node/src/shared/services/storage.service.ts:25` writes JSON directly with `fs.writeFile`; not atomic.
- `apps/worker-node/src/shared/services/storage.service.ts:35` parses JSON and returns typed `T` before schema validation.
- `apps/worker-node/src/modules/report/report.service.ts:19` distinguishes missing.
- `apps/worker-node/src/modules/report/report.service.ts:30` distinguishes malformed.
- `apps/worker-node/src/modules/report/report.service.ts:42` distinguishes schema-invalid.
- Missing states from production SRS still absent: stale, permission-denied as public state.

### Graph contract + semantics

- `packages/contracts/src/index.ts:42` limits `GraphNodeType` to `page | component | api | file`.
- `packages/contracts/src/index.ts:43` limits `GraphEdgeType` to `import | use | call`; no `render`, `http`, `route`.
- `packages/contracts/src/index.ts:60` summary exposes only count fields; no graph mode/version/confidence.
- `apps/worker-node/src/modules/graph/graph.service.ts:48` creates file-scoped node ids: `file:<relativePath>`.
- `apps/worker-node/src/modules/graph/graph.service.ts:183` maps one node per source file.
- `apps/worker-node/src/modules/graph/graph.service.ts:188` counts node types, still file-level page/component/api count.
- `apps/worker-node/src/modules/graph/graph.service.ts:198` builds only import edges.
- `apps/worker-node/src/modules/graph/symbol-detector.ts:89` detects PascalCase declarations and API calls, but output is not promoted into symbol nodes/edges.
- `apps/worker-node/src/modules/graph/symbol-detector.ts:135` records direct fetch/axios/ky/ofetch/custom-client calls only when endpoint is a string literal.

### Import resolver production

- `apps/worker-node/src/modules/graph/graph.service.ts:115` ignores all non-relative imports.
- `apps/worker-node/src/modules/graph/graph.service.ts:120` handles extension/index candidates only.
- No `tsconfig.json` `baseUrl` or `paths` alias support; `@/*` cannot resolve.

### Project discovery

- `apps/worker-node/src/modules/project/project.service.ts:63` parses package JSON for deps.
- `apps/worker-node/src/modules/project/project.service.ts:75` swallows JSON parse errors with empty catch.
- Project discovery should return explicit malformed package metadata or warning, not silently degrade.

### CLI lifecycle

- `apps/cli-host/src/main.ts:40` spawns `npm run dev -w @lutest/worker-node`.
- `apps/cli-host/src/main.ts:80` has no command parser.
- `apps/cli-host/src/main.ts:98` only waits for status.
- `apps/cli-host/src/main.ts:100` prints status and never calls scan.
- `apps/cli-host/src/main.ts:89` cleanup always exits `0` and does not model scan result exit codes.
- Missing command: `lutest scan <projectPath>`.

### CORS/config

- `apps/worker-node/src/app.ts:14` hardcodes `Access-Control-Allow-Origin` to `http://localhost:3000`.
- Production config should own CORS origin.

### Fixtures/tests

- `production-test-fixtures-plan.md` missing.
- Current audit found no fixture directories required by production prompt: `fixtures/next-basic-shop`, `fixtures/next-custom-api-client`.
- CodeGraph reports no covering tests for `RunScanInput`, `BuildAndSaveGraphInput`, `GetLatestReportInput`, `ProjectPaths`.

## 5. Refactor phases

### R1 — API route naming + runtime validation

Goal:
- Add production route `POST /api/actions/scan`.
- Keep or document `/api/scan` as legacy compatibility if needed.
- Tighten request/response validators without unsafe casts.
- Ensure errors use contract error codes.

Likely files:
- `apps/worker-node/src/app.ts`
- `apps/worker-node/src/modules/scan/scan.routes.ts`
- `apps/worker-node/src/modules/scan/scan.controller.ts`
- `apps/worker-node/src/shared/http/respond.ts`
- `packages/contracts/src/index.ts`

### R2 — path security policy

Goal:
- One canonical path policy service.
- Absolute path required at trust boundary.
- Realpath and allowed-root enforcement active.
- Consistent errors for missing/not-directory/disallowed.

Likely files:
- `apps/worker-node/src/shared/services/path-policy.service.ts`
- `apps/worker-node/src/shared/services/path.service.ts`
- `apps/worker-node/src/modules/scan/scan.controller.ts`
- `apps/worker-node/src/modules/project/project.controller.ts`
- `apps/worker-node/src/modules/graph/graph.controller.ts`
- `apps/worker-node/src/modules/report/report.controller.ts`

### R3 — report schema integrity

Goal:
- Atomic JSON writes.
- Latest report read distinguishes missing, malformed, schema-invalid, permission-denied, stale, ok.
- No typed JSON before validation.

Likely files:
- `apps/worker-node/src/shared/services/storage.service.ts`
- `apps/worker-node/src/modules/report/report.repository.ts`
- `apps/worker-node/src/modules/report/report.service.ts`
- `apps/worker-node/src/modules/scan/scan.repository.ts`
- `packages/contracts/src/index.ts`

### R4 — production graph contract

Goal:
- Add graph mode/version.
- Add symbol node types and production edge types.
- Preserve legacy mapping only when explicit.

Likely files:
- `packages/contracts/src/index.ts`
- `apps/worker-node/src/modules/graph/graph.mapper.ts`
- `apps/worker-node/src/modules/graph/graph.repository.ts`
- `apps/worker-node/src/modules/graph/graph.service.ts`

### R5 — AST symbol graph + import resolver

Goal:
- Build symbol nodes from declarations/routes/API methods/endpoints.
- Add render/call/http/route edges.
- Resolve relative, index, extension, `baseUrl`, `paths`, `@/*` aliases.
- Represent dynamic endpoints with confidence, not absolute certainty.

Likely files:
- `apps/worker-node/src/modules/graph/symbol-detector.ts`
- `apps/worker-node/src/modules/graph/graph.service.ts`
- `apps/worker-node/src/modules/graph/adapters/*`
- new small resolver module under `apps/worker-node/src/modules/graph/`

### R6 — fixtures + tests

Goal:
- Add minimal fixtures and assert production graph behavior.
- Tests fail if graph returns to file-level counting.

Likely files:
- `fixtures/next-basic-shop/**`
- `fixtures/next-custom-api-client/**`
- worker graph/report/path tests or self-checks
- `package.json` scripts if needed

### R7 — CLI production lifecycle

Goal:
- `lutest scan <projectPath>` runs end-to-end.
- Packaged worker path, status wait, scan call, summary output, clean shutdown.
- Exit code 0/1/2.

Likely files:
- `apps/cli-host/src/main.ts`
- `apps/cli-host/package.json`
- root `package.json`

### R8 — UI migration

Goal:
- Dashboard calls `/api/actions/scan`.
- Shows graph mode and handles report states.

Likely files:
- `apps/ui/**`

## 6. Current phase

R0 — docs + audit.

Scope:
- Read required docs or equivalents.
- Audit current code.
- Create progress file.
- Stop before feature code.

## 7. Done / In Progress / Blocked

Done:
- Read available production docs under `docs/plant_new` and old progress docs under `docs/plan_old`.
- Audited core worker, contracts, graph, report, path, scan, project, CLI lifecycle files.
- Accepted MVP checkpoint and marked production pivot.
- Listed concrete gaps by file and line.

In Progress:
- R0 validation/checks.

Blocked:
- `production-test-fixtures-plan.md` missing.
- Required docs were expected under `docs/plan`, but actual new docs are under `docs/plant_new`.

## 8. Files changed

- `docs/plan/production-refactor-progress.md`

## 9. Tests required

For R0:
- Run typecheck to ensure docs-only change does not mask existing TypeScript issues.

For next phases:
- R1: API route/validator self-check or focused tests for `POST /api/actions/scan` and invalid payloads.
- R2: path policy self-checks for relative path, missing path, blocked generated dir, outside allowed root.
- R3: report repository/service self-checks for missing, malformed, schema-invalid, permission-denied, stale, ok.
- R4/R5: graph fixture tests proving symbol nodes and render/call/http/route edges.
- R6: fixtures `next-basic-shop` and `next-custom-api-client` with assertions required by prompt.
- R7: CLI e2e check for `lutest scan <fixturePath>` with exit codes.

## 10. Next action

Recommended next phase: R1 — API route naming + runtime validation.

Concrete R1 first patch:
- Add `/api/actions/scan` route mount in `apps/worker-node/src/app.ts` without breaking legacy `/api/scan` unless user wants removal.
- Strengthen `packages/contracts/src/index.ts` validators to build typed values instead of `as unknown as` casts.
- Add response validation where reports are read/written if smallest diff allows.
- Add focused self-check for scan request/response validator behavior.

## R0.5 — Docs normalization

Status: Done
Updated: 2026-06-30

Canonical production docs path:
- `docs/plan/`

Files copied into canonical path:
- `docs/plant_new/master-srs-production.md` -> `docs/plan/master-srs-production.md`
- `docs/plant_new/production-implementation-roadmap.md` -> `docs/plan/production-implementation-roadmap.md`
- `docs/plant_new/api-contract-production.md` -> `docs/plan/api-contract-production.md`
- `docs/plant_new/graph-ast-symbol-design.md` -> `docs/plan/graph-ast-symbol-design.md`
- `docs/plant_new/migration-plan-from-mvp-to-production.md` -> `docs/plan/migration-plan-from-mvp-to-production.md`
- `docs/plan_old/zero-debt-audit-roadmap.md` -> `docs/plan/zero-debt-audit-roadmap.md`

Files created:
- `docs/plan/production-test-fixtures-plan.md` — minimal TODO fixture plan because no source file existed.

Archive/reference paths:
- `docs/plan_old/` remains archive/reference for older MVP material.
- `docs/plant_new/` is no longer canonical for production phases.

Canonical production docs now present:
- `docs/plan/master-srs-production.md`
- `docs/plan/production-implementation-roadmap.md`
- `docs/plan/api-contract-production.md`
- `docs/plan/graph-ast-symbol-design.md`
- `docs/plan/production-test-fixtures-plan.md`
- `docs/plan/migration-plan-from-mvp-to-production.md`
- `docs/plan/zero-debt-audit-roadmap.md`
- `docs/plan/production-refactor-progress.md`

Still missing:
- `docs/plan/master-srs-context.md` remains missing; not required by R0.5 minimum list.
- `docs/plan/project-progress-total-timeline.md` remains archived only at `docs/plan_old/project-progress-total-timeline.md`; not required by R0.5 minimum list.

Next action:
- Begin R1 — API route naming + runtime validation.

## R1 — API route naming + runtime validation

Status: Done
Updated: 2026-06-30

Canonical scan route:
- `POST /api/actions/scan`

Legacy route:
- `POST /api/scan` remains mounted as a temporary legacy alias.
- New UI code now calls only `/api/actions/scan`.

Files changed:
- `apps/worker-node/src/app.ts`
- `apps/worker-node/src/shared/http/validated-project-path.ts`
- `apps/worker-node/src/modules/graph/graph.controller.ts`
- `apps/worker-node/src/modules/report/report.controller.ts`
- `apps/ui/src/lib/api-client.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Validators changed:
- `validateScanRequest(input: unknown): ValidationResult<ScanRequest>` keeps body validation at scan boundary.
- `validateProjectPathQuery(input: unknown): ValidationResult<ProjectPathQuery>` now validates the whole query object and rejects unknown query fields.
- `validateGraphQuery(input: unknown): ValidationResult<ProjectPathQuery>` added.
- `validateLatestReportQuery(input: unknown): ValidationResult<ProjectPathQuery>` added.
- `validateLatestReportResponse` no longer returns `value as unknown as LatestReportResponse`.
- `validateScanResponse` no longer returns `value as unknown as ScanResponse`.
- `validateScanResponse` now validates project summary and issues before constructing typed output.

Controller boundary behavior:
- Scan controller validates `req.body` before service call.
- Shared project-path helper validates entire `req.query` before reading `path`.
- Graph controller uses `validateGraphQuery`.
- Report controller uses `validateLatestReportQuery`.
- Invalid requests still return `400 INVALID_REQUEST` through `sendValidationError` and `ApiErrorResponse` shape.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w @lutest/cli-host` — passed.
- `npm run build --workspaces --if-present` — invoked; UI/Next output stops after `Finished TypeScript in ...` in this harness, no usable final exit/status is emitted.
- `npm run build -w ui` — same UI/Next harness output issue.
- `npm test --workspaces --if-present` — passed; no workspace test scripts emitted.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.

Remaining issues:
- `POST /api/scan` still exists only as legacy alias; remove after consumers migrate.
- `ValidationResult` still uses existing `{ ok: false, code, message, details }` shape to avoid broad churn; `sendValidationError` maps it to `ApiErrorResponse`.
- Path allowed-root enforcement remains R2 scope.
- UI build final status is not captured cleanly by this harness for Next workspace; backend/contracts/CLI builds pass.

Next phase:
- R2 — Path policy production.

## R1.1 — Verification cleanup

Status: Done
Updated: 2026-06-30

Scan body validation status:
- `apps/worker-node/src/modules/scan/scan.controller.ts` uses `validateScanRequest(req.body)` before reading `validation.value.projectPath`.
- No `req.body as ScanRequest` pattern found in runtime code.
- No `req.body as unknown as ScanRequest` pattern found in runtime code.
- Invalid body response verified through `POST /api/actions/scan` with `{ "projectPath": "" }`: HTTP `400`, JSON `error.code` is `INVALID_REQUEST`.

Dangerous casts search:
- Search command: `rg -n "as ScanRequest|as unknown as|req\.query as|req\.body as|req\.body|req\.query" . -g "!node_modules" -g "!.next" -g "!dist"`
- Runtime boundary code found only validated reads:
  - `apps/worker-node/src/modules/scan/scan.controller.ts` reads `req.body` only through `validateScanRequest(req.body)`.
  - `apps/worker-node/src/shared/http/validated-project-path.ts` reads `req.query` only through injected query validator.
- No dangerous HTTP boundary casts found in runtime code.
- Documentation still contains historical references to old unsafe casts/gaps; kept as audit history, not runtime code.

UI build status:
- Required command `npm run build -w @lutest/ui` does not run because workspace name is `ui`, not `@lutest/ui`.
- Verified with `npm pkg get name -w ui`: workspace package name is `ui`.
- Actual UI build command `npm run build -w ui` invokes Next build and prints `Finished TypeScript in ...`, but this harness does not emit a final exit/status line for that command. No pass/fail claim is made for UI build.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — exit 0.
- `npm run build -w @lutest/contracts` — exit 0.
- `npm run build -w @lutest/worker-node` — exit 0.
- `npm run build -w @lutest/cli-host` — exit 0.
- `npm run build -w @lutest/ui` — fails: no such workspace.
- `npm run build -w ui` — invoked; Next/harness did not return final status line.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — exit 0.
- `npx tsx -e <scan invalid body self-check>` — exit 0, verified canonical route returns `400 INVALID_REQUEST` for invalid body.

Remaining issues:
- `apps/ui/package.json` package name is `ui`; required scoped command `npm run build -w @lutest/ui` cannot work unless package is renamed in a future UI/package cleanup.
- UI build final status remains unverified due to harness behavior with Next build output.
- Path allowed-root policy remains R2 scope.

Next phase:
- R2 — Path policy production.


## R2 — Path policy production

Status: Done
Updated: 2026-06-30

AllowedRoot source:
- Canonical worker allowed root comes from `LUTEST_PROJECT_PATH`.
- Backward-compatible fallback uses `PROJECT_PATH`.
- If neither exists, fallback is `process.cwd()` for current dev runner compatibility until R7 CLI lifecycle passes explicit project root.

Rules implemented:
- Request project path must be absolute.
- Network/UNC paths are rejected.
- Path must exist and be a directory.
- Path must equal allowedRoot or be inside allowedRoot.
- Sibling/outside paths fail with `PATH_NOT_ALLOWED`.
- Generated/ignored directories cannot be project roots: `.git`, `node_modules`, `.next`, `dist`, `build`, `.lutest`.
- Missing request path uses allowedRoot, so `GET /api/project` and other no-path API calls stay functional.
- `pathService.resolveProjectPaths` now enforces `pathPolicyService.assertProjectRoot` before building `.lutest` paths.

Endpoints affected:
- `GET /api/project?path=...`
- `GET /api/graph?path=...`
- `GET /api/report/latest?path=...`
- `POST /api/actions/scan { projectPath }`
- Legacy `POST /api/scan { projectPath }`

Files changed:
- `apps/worker-node/src/shared/services/path-policy.service.ts`
- `apps/worker-node/src/shared/services/path-policy.service.self-check.ts`
- `apps/worker-node/src/shared/services/path.service.ts`
- `apps/worker-node/src/shared/services/path.service.self-check.ts`
- `apps/worker-node/src/shared/http/validated-project-path.ts`
- `apps/worker-node/src/modules/config/config.service.ts`
- `docs/plan/production-refactor-progress.md`

What was removed:
- Dead `LUTEST_ALLOWED_ROOTS` policy path from `path.service.ts`.
- Old path-service self-check assumptions around `LUTEST_ALLOWED_ROOTS`.
- Request/API ability to select arbitrary sibling/outside folders as scan roots.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npm run build -w @lutest/cli-host` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path.service.self-check.ts` — passed, exit `0`.

Remaining risks:
- Until R7, CLI does not always pass explicit `LUTEST_PROJECT_PATH`; dev fallback remains `process.cwd()`.
- Controllers still pass `process.cwd()` as worker root; pathService now treats scan target separately via allowedRoot policy.
- UI build workspace name remains `ui`, not `@lutest/ui`; R2 does not address UI package naming.

Next phase:
- R3 — Report integrity.

## R2.1 — HTTP path-policy verification

Status: Done
Updated: 2026-06-30

HTTP endpoints verified:
- `GET /api/project` — allowed, uses allowedRoot.
- `GET /api/project?path=<allowedRoot>` — allowed.
- `GET /api/project?path=<outsideRoot>` — blocked with `PATH_NOT_ALLOWED` JSON.
- `GET /api/graph` — allowed, uses allowedRoot.
- `GET /api/graph?path=<allowedRoot>` — allowed.
- `GET /api/graph?path=<outsideRoot>` — blocked with `PATH_NOT_ALLOWED` JSON.
- `GET /api/report/latest` — allowed, returns normal report state.
- `GET /api/report/latest?path=<allowedRoot>` — allowed.
- `GET /api/report/latest?path=<outsideRoot>` — blocked with `PATH_NOT_ALLOWED` JSON.
- `POST /api/actions/scan { "projectPath": "<allowedRoot>" }` — allowed.
- `POST /api/actions/scan { "projectPath": "<outsideRoot>" }` — blocked with `PATH_NOT_ALLOWED` JSON.

Outside path result:
- Outside roots are rejected at HTTP boundary.
- Existing policy response status is `403` for controller-level path rejection through `sendPathError`.
- Error body is JSON and uses `error.code: "PATH_NOT_ALLOWED"`.

Bypass search:
- Searched `process.cwd()`, `resolveProjectPaths(`, `assertProjectRoot(`, and `projectPath` across worker/contracts source.
- No module was found resolving request project roots outside `pathPolicyService`/`pathService`.
- `process.cwd()` remains in controllers as worker-root/dev context input, but target root is policy-gated by `getValidatedProjectPath` and/or `pathService.resolveProjectPaths`.
- `path-policy.service.ts` still falls back to `process.cwd()` only when `LUTEST_PROJECT_PATH` and `PROJECT_PATH` are both absent; this is R7/config cleanup debt, not an HTTP bypass in current path flow.

Files changed:
- `apps/worker-node/src/shared/services/path-policy.http-self-check.ts`
- `docs/plan/production-refactor-progress.md`

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npm run build -w @lutest/cli-host` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.

Remaining issues:
- R7 should remove ambiguity by always starting worker with explicit `LUTEST_PROJECT_PATH` from CLI/config.
- `process.cwd()` controller arguments should be cleaned during R7/config lifecycle if they become confusing, but current scan target remains policy-gated.
- UI workspace naming remains `ui`, not `@lutest/ui`; not part of R2.1.

Next phase:
- R3 — Report integrity.

## R3 — Report integrity

Status: Done
Updated: 2026-06-30

Read result states implemented:
- `storageService.readJsonResult<T>()` now returns `kind`: `ok`, `missing`, `malformed`, `permission-denied`, `unknown-error`.
- `reportRepository.findLatest()` maps storage results into report states: `ok`, `missing`, `malformed`, `schema-invalid`, `permission-denied`, `unknown-error`.
- Legacy `storageService.readJson<T>()` remains as compatibility wrapper returning `T | null`.

Latest report API behavior:
- Missing latest report returns data response: `{ state: "missing", report: null }`.
- Valid latest report returns data response: `{ state: "valid", report }`.
- Malformed JSON throws `HttpError` with `REPORT_MALFORMED`; API returns JSON error, not `report: null`.
- Schema-invalid report throws `HttpError` with `REPORT_SCHEMA_INVALID`; API returns JSON error, not `report: null`.
- Permission-denied read throws `REPORT_PERMISSION_DENIED` when filesystem exposes `EACCES`/`EPERM`.

Schema validation status:
- Latest report disk JSON is parsed as `unknown`, then validated with `validateScanResponse` before returning.
- `LatestReportResponse` contract now models only valid data states: `missing` and `valid`; corrupted reports are API errors.
- Added report-specific error codes: `REPORT_MALFORMED`, `REPORT_SCHEMA_INVALID`, `REPORT_PERMISSION_DENIED`.

Report write validation status:
- `scanRepository.saveReport()` validates `ScanResponse` before writing any report file.
- Invalid internal report shape throws `REPORT_SCHEMA_INVALID` and does not write report JSON.
- `storageService.writeJson()` now writes to a temp file and renames temp to final path for per-file atomic write.
- Parent directories are ensured before write.

Files changed:
- `apps/worker-node/src/shared/services/storage.service.ts`
- `apps/worker-node/src/modules/report/report.repository.ts`
- `apps/worker-node/src/modules/report/report.service.ts`
- `apps/worker-node/src/modules/report/report.service.self-check.ts`
- `apps/worker-node/src/modules/report/report-integrity.self-check.ts`
- `apps/worker-node/src/modules/scan/scan.repository.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/latest-report.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npm run build -w @lutest/cli-host` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/latest-report.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed, exit `0`.

Remaining risks:
- Permission-denied branch is mapped from Node `EACCES`/`EPERM`, but not force-tested cross-platform because Windows ACL mutation is not reliable in this sandbox.
- `scanRepository.saveReport()` writes report file and latest file as two separate atomic writes; no transaction spans both files.
- UI may need to adapt to corrupted-report HTTP error responses instead of old `state: malformed/schema-invalid` data states; UI redesign is out of R3 scope.

Next phase:
- R4 — Production graph contracts.

## R4 — Production graph contracts

Status: Done
Updated: 2026-06-30

Contracts added:
- `ProductionGraphNodeKind`: `file`, `page`, `component`, `hook`, `api-route`, `api-client-method`, `utility`, `external-endpoint`.
- `ProductionGraphEdgeKind`: `import`, `render`, `call`, `http`, `route`.
- `GraphConfidence`: `high`, `medium`, `low`.
- `ProductionGraphNode` with id, kind, name, optional file path, optional loc/route/http metadata, confidence, reason.
- `ProductionGraphEdge` with id, kind, source, target, confidence, reason.
- `ProductionGraphSummary` with file/page/component/hook/api route/api client/external endpoint/edge counts.
- `ProductionGraphResponse` with `mode: "symbol-level"`.

Validators added:
- `validateProductionGraphResponse(input: unknown): ValidationResult<ProductionGraphResponse>`.
- `validateProductionGraphNode(input: unknown): ValidationResult<ProductionGraphNode>`.
- `validateProductionGraphEdge(input: unknown): ValidationResult<ProductionGraphEdge>`.
- Validators construct typed outputs and do not use `as unknown as`.
- Validator enforces summary counts against graph contents, including `edgeCount`.

Self-check status:
- Added `packages/contracts/src/production-graph.self-check.ts`.
- Covers valid production graph, invalid node kind, invalid edge kind, missing confidence, missing reason, and summary edgeCount mismatch.

Legacy graph compatibility status:
- Legacy `GraphResponse`, `GraphNode`, `GraphEdge`, and `GraphSummary` remain unchanged for current worker/UI file-level graph compatibility.
- R4 did not pretend legacy graph is symbol-level.
- No legacy-to-production adapter added yet; R5 should produce real symbol graph or an explicitly marked low-confidence compatibility adapter if needed.

GET /api/graph behavior:
- Unchanged in R4.
- Still returns legacy file-level `GraphResponse` from current graph service.
- No new graph endpoint added.

Files changed:
- `packages/contracts/src/index.ts`
- `packages/contracts/src/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npm run build -w @lutest/cli-host` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/latest-report.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path.service.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed, exit `0`.

Remaining risks:
- R4 is contract-only; AST symbol extraction is not implemented yet.
- Current graph summary remains legacy file-level until R5.
- Import alias resolver, route discovery production, render/call/http edge extraction remain R5 scope.

Next phase:
- R5 — AST symbol graph engine.

## R5.0 — AST symbol graph engine audit + integration plan

Status: Done
Updated: 2026-06-30

### Current graph engine status

Graph build flow today:
- `apps/worker-node/src/modules/graph/graph.controller.ts` keeps `GET /api/graph` typed as legacy `GraphResponse` and calls `graphService.buildAndSaveGraph`.
- `apps/worker-node/src/modules/graph/graph.service.ts` lists source files with extensions `.ts`, `.tsx`, `.js`, `.jsx`, excluding `node_modules`, `.git`, `dist`, `build`, `.next`, `.lutest`, and test/story/type files.
- `graph.service.ts` reads full file contents, gets framework adapter via `frameworkAdapterRegistry.getAdapterForProject`, runs `detectSymbols`, then creates one graph node per file with `toNode`.
- `toNode` emits ids like `file:<relativePath>` and type `file | page | component | api` based on adapter path heuristics.
- `toApiAwareNode` can change a file node from `file` to `api` when detected API calls exist and attaches API call data under `node.data.apiCalls`.
- `buildGraph` counts `pageCount`, `componentCount`, and `apiCount` by node type and sets `fileCount` to node count.
- `buildImportEdges` creates only legacy import edges between file nodes.

Current count mode:
- Counts are file-level, not symbol-level.
- A file containing multiple React components still becomes one node.
- `symbol-detector` declarations are currently used only by adapters for classification; declarations are not emitted as graph nodes.
- API calls are metadata on file nodes, not `api-client-method` or `external-endpoint` production nodes.

Import resolver status:
- `apps/worker-node/src/modules/graph/graph.service.ts` resolves only relative import specifiers that start with `.`.
- It supports raw target, extension candidates `.ts/.tsx/.js/.jsx`, and `index` candidates.
- `apps/worker-node/src/modules/graph/graph.mapper.ts` has similar legacy relative import resolver logic for old mapper path.
- No `tsconfig.json` `baseUrl`, `paths`, or `@/*` alias resolver exists.
- No package import semantic resolution exists.

AST/parser status:
- `apps/worker-node/src/modules/graph/symbol-detector.ts` uses TypeScript `ts.createSourceFile` already.
- It walks the AST with `ts.forEachChild`.
- This is a starting parser, not yet a production graph engine.

Symbol detector status:
- `symbol-detector.ts` extracts PascalCase `function` declarations, `class` declarations, and `const` variable declarations with arrow/function-expression initializer.
- It records declaration name, kind, line, and column.
- It filters declarations through PascalCase only; hooks/utilities/lowercase functions are not represented.
- It detects call expressions for direct `fetch`, direct `ofetch`, property access root `axios`, `ky`, `ofetch`, and any property method named `get/post/put/patch/delete/head/options/request` as `custom-client`.
- It only records API call targets when first argument is a string literal.
- It records API kind, target string, optional method, line, column, and callee text.
- It does not extract JSX render usage, normal function calls, imports as AST nodes, routes, dynamic endpoints, or confidence.

API call detector status:
- `apps/worker-node/src/modules/graph/api-call-detector.ts` does not exist.
- Current API-call detection lives inside `symbol-detector.ts`.

Graph snapshot persistence:
- `apps/worker-node/src/modules/graph/graph.repository.ts` saves legacy graph snapshots to `paths.latestGraphPath`, which resolves to `.lutest/graph/latest-graph.json`.
- `graph.repository.findLatest` reads legacy `GraphResponse | null` through storage legacy wrapper.

Legacy graph dependencies:
- `apps/ui/src/lib/api-client.ts` calls `/api/graph` and expects `GraphResponse`.
- `apps/ui/src/lib/use-dashboard-data.ts` stores `graph: GraphResponse | null` and reloads graph after scan.
- `apps/ui/src/components/dashboard-shell.tsx` renders legacy graph summary/nodes/edges and latest report state.
- `scan.service.ts` calls `graphService.buildAndSaveGraph` during scan, but scan response itself does not expose graph response.

Missing/unused files:
- Missing: `apps/worker-node/src/modules/graph/api-call-detector.ts`.
- Existing but not used by current graph service path: `apps/worker-node/src/modules/graph/graph.mapper.ts` legacy source-file graph mapper.

### Recommended migration strategy

Recommended: Option A for R5.1–R5.6, with optional Option B after builder is useful.

Option A — keep `GET /api/graph` returning legacy `GraphResponse` short-term:
- Safest for UI compatibility.
- Build production graph internally and validate/persist it in parallel once R5 builder exists.
- R8 can later migrate UI deliberately.

Option B — add `GET /api/graph/production` later for dev/test:
- Useful once R5.5 has a validated `ProductionGraphResponse` builder.
- Should not be added in R5.0.
- Good bridge before R8 UI migration.

Option C — change `GET /api/graph` to `ProductionGraphResponse` now:
- Not recommended.
- Current UI and worker graph code still depend on legacy shape.
- Current engine is file-level and would misrepresent mode if returned as `symbol-level`.

R5.0 decision:
- Do not change `GET /api/graph` behavior.
- Do not create new endpoint yet.
- Implement production builder as internal module first.

### Proposed R5 module structure

Target structure:
- `apps/worker-node/src/modules/graph/ast/parse-source-file.ts`
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/ast/extract-imports.ts`
- `apps/worker-node/src/modules/graph/ast/resolve-imports.ts`
- `apps/worker-node/src/modules/graph/ast/extract-jsx-usage.ts`
- `apps/worker-node/src/modules/graph/ast/extract-calls.ts`
- `apps/worker-node/src/modules/graph/ast/extract-api-calls.ts`
- `apps/worker-node/src/modules/graph/ast/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/ast/production-graph.mapper.ts`

Data shape approach:
- Parse source file once into `ts.SourceFile` plus normalized relative path.
- Extract neutral intermediate facts first: declarations, imports, JSX usages, call expressions, API calls, routes.
- Resolve imports after all source facts are collected.
- Build `ProductionGraphResponse` only after facts are resolved and confidence/reasons assigned.

### R5.1 — AST parse + symbol extraction

Files to change:
- Add `apps/worker-node/src/modules/graph/ast/parse-source-file.ts`.
- Add `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`.
- Add focused self-check under graph/ast.
- Reuse lessons from `symbol-detector.ts`; do not delete it yet.

Expected output:
- Parsed source facts for declarations with kind candidates: page/component/hook/utility/api route candidate.
- Include file path, symbol name, loc start/end if available, export status if cheap.

Acceptance criteria:
- Parses `.ts/.tsx/.js/.jsx` fixtures without throwing.
- Extracts PascalCase components, hooks starting with `use`, exported utilities, Next page/route candidates by path.
- Does not create graph response yet.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- `npm run build -w @lutest/worker-node`
- `npx tsx ./apps/worker-node/src/modules/graph/ast/<self-check>.ts`

### R5.2 — Import extraction + resolver

Files to change:
- Add `extract-imports.ts`.
- Add `resolve-imports.ts`.
- Add tsconfig reader helper if needed.

Expected output:
- Extract import specifiers with source file and imported bindings.
- Resolve relative imports, extension candidates, index candidates.
- Add initial support for `baseUrl` and `paths` including `@/*`.

Acceptance criteria:
- Relative imports resolve to source files.
- `@/*` alias resolves in fixture with `tsconfig.json` paths.
- Unresolved imports stay unresolved facts with low confidence reason; no false certainty.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- `npm run build -w @lutest/worker-node`
- import resolver self-check.

### R5.3 — JSX render edge extraction

Files to change:
- Add `extract-jsx-usage.ts`.
- Update intermediate fact types.

Expected output:
- JSX component usage facts such as page/component rendering component.
- Candidate render edges can be built only when symbol resolution is confident.

Acceptance criteria:
- `<ProductCard />` in a page resolves to component declaration when imported or same file.
- Lowercase HTML elements are ignored.
- Dynamic component cases are low confidence or skipped with reason.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- JSX usage self-check.

### R5.4 — Call/API/http edge extraction

Files to change:
- Add `extract-calls.ts`.
- Add `extract-api-calls.ts` or move current API-call logic out of `symbol-detector.ts`.
- Optionally add `api-call-detector.ts` if keeping non-ast folder naming.

Expected output:
- Call facts between local symbols when resolvable.
- API client method facts.
- External endpoint facts.
- HTTP edges from API client method/caller to endpoint.

Acceptance criteria:
- Detects `fetch('/api/products')`, `axios.get('/api/products')`, `ky.post(...)`, `ofetch(...)`, and custom client methods when statically obvious.
- Dynamic endpoint is not marked high-confidence static endpoint.
- Method and target path are retained when known.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- API/call extraction self-check.

### R5.5 — ProductionGraphResponse builder

Files to change:
- Add `production-graph-builder.ts`.
- Add `production-graph.mapper.ts`.
- Optionally update `graph.service.ts` to build production graph internally without changing `GET /api/graph` response.
- Optionally update `graph.repository.ts` to save production snapshot separately only after stable file path decision.

Expected output:
- Valid `ProductionGraphResponse` with `mode: "symbol-level"`.
- Nodes: file/page/component/hook/api-route/api-client-method/utility/external-endpoint.
- Edges: import/render/call/http/route.
- Summary matches validator counts.

Acceptance criteria:
- Output passes `validateProductionGraphResponse`.
- Legacy `GET /api/graph` remains unchanged unless explicit migration decision is made.
- If mapping from legacy exists, it must be marked low confidence and not called symbol-level production output.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- `npm run build -w @lutest/worker-node`
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts`
- production builder self-check.

### R5.6 — Fixtures/self-checks

Files to change:
- Add minimal fixtures under planned `fixtures/next-basic-shop` and `fixtures/next-custom-api-client` if R6 is not yet reached, or add temporary local self-check fixtures under graph/ast test data.
- Add graph production self-check command(s).

Expected output:
- Regression checks prove symbol-level graph cannot regress to file-level counting.

Acceptance criteria:
- Framework detection correct.
- Route/page/api route counts correct.
- Component declaration count correct.
- Render/call/http edges correct for minimal fixture.
- `@/*` alias import resolves when supported.
- Dynamic endpoint is not reported as high-confidence static endpoint.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- graph fixture self-check(s).

### R5.7 — API migration decision

Files to change:
- `graph.controller.ts`, `graph.routes.ts`, `graph.service.ts`, and UI API client only if migration is approved.

Expected output:
- Decision between continuing Option A, adding `GET /api/graph/production` Option B, or migrating `GET /api/graph` Option C.

Acceptance criteria:
- UI not broken.
- API response mode is honest.
- Legacy graph consumers still have compatibility path.
- Production graph response passes runtime validator before exposure.

Verification commands:
- `npm run typecheck --workspaces --if-present`
- `npm run build -w @lutest/worker-node`
- `npm run build -w @lutest/contracts`
- endpoint self-check if new route added.

### Risks

- Current `symbol-detector.ts` has AST traversal but not enough semantic resolution for production graph.
- Import alias support needs careful tsconfig path resolution and Windows path normalization.
- JSX/call resolution can over-report if symbol import binding is not tracked; default should be lower confidence or skipped.
- API client wrapper detection can produce false positives because current logic treats any `.get/.post/...` property access as custom client.
- Large rewrite risk in `graph.service.ts`; R5 should isolate new AST modules and integrate only after self-checks pass.
- UI still consumes legacy `GraphResponse`; changing `/api/graph` too early will break dashboard.

### Next action

Start R5.1 — AST parse + symbol extraction.

## R5.1 — AST parse + symbol extraction

Status: Done
Updated: 2026-06-30

Files created:
- `apps/worker-node/src/modules/graph/ast/ast.types.ts`
- `apps/worker-node/src/modules/graph/ast/parse-source-file.ts`
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts`

Symbol kinds supported:
- `component`: PascalCase function/class/arrow/function-expression symbols; high confidence when TSX/JSX function body contains JSX; medium confidence in `components/` or `ui/` paths.
- `hook`: function-like names matching `use[A-Z0-9]`.
- `page`: Next `app/**/page.*` and `pages/**/*` excluding `pages/api/**` when component-like page export exists.
- `api-route`: Next `app/**/route.*` or `pages/api/**` HTTP method handlers such as `GET`/`POST`.
- `api-client-method`: function-like symbols containing direct `fetch`, `axios`, `ky`, or `ofetch` string-literal network calls.
- `utility`: exported function-like symbols that do not match higher-priority classifications.

Parser behavior:
- Uses TypeScript compiler API via `ts.createSourceFile`.
- Supports `.ts`, `.tsx`, `.js`, `.jsx`; unsupported extensions return kind `unsupported` and no symbols.
- Returns parse diagnostics as strings without throwing on normal syntax errors.
- Loc uses 1-based `startLine` and `endLine` from `getLineAndCharacterOfPosition`.

Self-check coverage:
- TSX function component: `ProductCard`.
- TSX arrow component: `ProductGrid`.
- Hook: `useProducts`.
- Next page file: `app/products/page.tsx` default export component.
- Next route handler: `app/api/products/route.ts` `GET` export.
- API client method: `getProducts` with direct `fetch('/api/products')`.
- Lowercase helper: `formatMoney` is not emitted as component/symbol.
- Parse diagnostics are collected for broken source.

Limitations:
- No import resolver yet.
- No JSX render edges yet.
- No call graph or external endpoint nodes yet.
- No `ProductionGraphResponse` builder yet.
- No graph repository/API/UI integration changed.
- API client detection is direct-only and requires string-literal target.
- Custom client chain detection remains R5.4 scope.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.1 — Generic AST extraction + framework adapter classification boundary

Status: Done
Updated: 2026-06-30

Files changed:
- `apps/worker-node/src/modules/graph/ast/ast.types.ts`
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter-registry.ts`
- `apps/worker-node/src/modules/graph/adapters/next-js-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/react.adapter.ts`
- `docs/plan/production-refactor-progress.md`

What changed:
- Generic AST extraction now emits `RawAstSymbol[]` with syntax facts only: raw kind, export/default state, PascalCase, hook-like name, JSX presence, direct network calls, and source loc.
- Next-specific page/API/component file rules moved out of `extract-symbols.ts` into `next-js-adapter.ts`.
- `FrameworkAdapter` now owns `classifyFile()` and `classifySymbol()` for raw-symbol-to-production-kind classification.
- Legacy adapter methods remain for existing file-level graph service compatibility.
- React and default adapters were updated to classify raw AST symbols without changing `GET /api/graph`.

Removed from generic extractor:
- Next app router page detection.
- Next pages router page detection.
- Next app route file detection.
- `pages/api/**` API route detection.
- `components/**` and `ui/**` component path classification.

Self-check coverage:
- Generic TSX component raw symbol has `pascalCase: true` and `hasJsx: true`.
- Generic hook raw symbol has `hookName: true`.
- Generic API client raw symbol has `hasDirectNetworkCall: true` and direct target `/api/products`.
- Lowercase helper remains raw-only and is not classified into component by generic extraction.
- Next adapter classifies `app/products/page.tsx` default export as `page`.
- Next adapter classifies `app/api/products/route.ts` `GET` handler as `api-route`.
- Next adapter classifies PascalCase JSX component as `component`.
- Next adapter classifies direct fetch wrapper as `api-client-method`.

Limitations:
- No import resolver yet.
- No JSX render edges yet.
- No call graph or endpoint graph nodes yet.
- No `ProductionGraphResponse` builder yet.
- No `/api/graph` response shape change.
- Generic direct network detection remains direct-only and string-literal-only.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.
- PowerShell emitted npm/npx shim `Test-Path : Access is denied` warnings after commands; explicit exit markers were all `0`.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.2 — Adapter interface cleanup + vite-react mapping

Status: Done
Updated: 2026-06-30

Files changed:
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter-registry.ts`
- `apps/worker-node/src/modules/graph/adapters/next-js-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/react.adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts`
- `apps/worker-node/src/modules/graph/graph.service.ts`
- `docs/plan/production-refactor-progress.md`

What changed:
- Production `FrameworkAdapter` now contains only `name`, `classifyFile()`, and `classifySymbol()`.
- Legacy file-level graph API moved to separate `LegacyFrameworkAdapter`.
- `nextJsAdapter` and `reactAdapter` are production adapters only.
- `nextJsLegacyAdapter` and `reactLegacyAdapter` keep graph v1 file-level behavior.
- `graph.service.ts` now explicitly requests `getLegacyAdapterForProject()` for legacy `GraphResponse` building.
- Registry now exposes `getAdapterForFramework()` for production graph phases and keeps `getAdapterForProject()` as compatibility framework detection helper.

Registry mapping:
- `next` -> `nextJsAdapter`.
- `react` -> `reactAdapter`.
- `vite-react` -> `reactAdapter`.
- Unknown/unsupported frameworks fall back to conservative default adapter.

Default adapter behavior:
- Production default adapter classifies only generic evidence: hook name, direct network call, PascalCase JSX, exported utility.
- Legacy default adapter no longer returns all declarations as components; it returns no pages, no components, and detected API calls only.

Self-check coverage:
- Next adapter classifies `app/products/page.tsx` default export component as `page`.
- Next adapter classifies `app/api/products/route.ts` `GET` as `api-route`.
- React adapter classifies `src/pages/Home.tsx` `Home` component as `page`.
- Registry maps `vite-react` to `reactAdapter`.
- Unknown default adapter does not blindly classify a lowercase helper as component.
- Unknown legacy adapter does not blindly return declarations as components.

Limitations:
- No import resolver yet.
- No JSX render edges yet.
- No call graph or production graph builder yet.
- `GET /api/graph` remains legacy `GraphResponse`.
- `getAdapterForProject()` still detects framework by reading `package.json`; duplicate detection cleanup remains later config/lifecycle scope.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed, exit `0`.
- PowerShell emitted npm/npx shim `Test-Path : Access is denied` warnings after commands; explicit exit markers were all `0`.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.2 — Adapter interface cleanup + generic AST boundary hardening

Status: Done
Updated: 2026-06-30

Files changed:
- `apps/worker-node/src/modules/graph/ast/ast.types.ts`
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/legacy-framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter-registry.ts`
- `apps/worker-node/src/modules/graph/adapters/next-js-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/react.adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts`
- `apps/worker-node/src/modules/graph/graph.service.ts`
- `docs/plan/production-refactor-progress.md`

What changed:
- `ParsedSourceFile.symbols` is now raw `RawAstSymbol[]`; generic extraction no longer stores classified output in `symbols`.
- Classified output is returned only by `classifyParsedSourceFile()` / `parseAndClassifySymbols()` after a `FrameworkAdapter` is provided.
- Production `FrameworkAdapter` imports only AST raw types and no longer imports `DetectedApiSymbol` or `DetectedDeclarationSymbol` from `symbol-detector.ts`.
- Legacy graph v1 adapter types moved to `legacy-framework-adapter.ts`.
- `graph.service.ts` explicitly uses `LegacyFrameworkAdapter` through `getLegacyAdapterForProject()`.
- Registry maps `vite-react` to `reactAdapter` and keeps unknown/null fallback conservative.

Boundary verification:
- `extract-symbols.ts` contains no Next app/page/pages/api/route/component path rules.
- `framework-adapter.ts` contains no legacy file-level methods and no symbol-detector imports.
- Legacy detector types are isolated to `legacy-framework-adapter.ts` and graph v1 usage.

Default adapter behavior:
- `hookName` -> `hook`.
- `hasDirectNetworkCall` -> `api-client-method`.
- `hasJsx && pascalCase` -> `component` with medium confidence.
- `exported` -> `utility` with low confidence.
- Else -> `null`.
- Legacy default adapter returns no page/component declarations blindly.

Self-check coverage:
- Generic extractor verifies PascalCase JSX, hook-like name, direct fetch target `/api/products`, and lowercase helper raw-only behavior.
- Next adapter verifies page route, API route handler, and component classification.
- React adapter verifies page and component classification.
- Registry verifies `vite-react` maps to `reactAdapter`.
- Unknown/null fallback does not classify lowercase helper as component.

Limitations:
- No import resolver yet.
- No JSX render edges yet.
- No call graph or production graph builder yet.
- No graph repository changes.
- No `/api/graph` response shape change.
- `getAdapterForProject()` still exists as compatibility helper and reads `package.json`.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed, exit `0`.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed, exit `0`.
- Boundary search: no framework-specific rules in `extract-symbols.ts`; no legacy imports/methods in `framework-adapter.ts`.
- PowerShell emitted npm/npx shim `Test-Path : Access is denied` warnings after commands; explicit exit markers were all `0`.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.3 — Move adapter classification helpers out of AST extractor

Status: Done
Updated: 2026-06-30

Files changed:
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/adapters/classify-parsed-source-file.ts`
- `apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts`
- `docs/plan/production-refactor-progress.md`

What changed:
- `extract-symbols.ts` now exports raw extraction only: `extractRawSymbolsFromParsedSource()` and `parseAndExtractRawSymbols()`.
- Adapter classification helpers moved to `adapters/classify-parsed-source-file.ts`.
- `ast-symbol.self-check.ts` now imports classification helpers from adapter layer.

Boundary verification:
- `extract-symbols.ts` no longer imports `FrameworkAdapter`.
- `extract-symbols.ts` no longer exports `classifyParsedSourceFile()` or `parseAndClassifySymbols()`.
- Classification helpers now live in adapter layer and import `FrameworkAdapter` there.
- `/api/graph` response shape unchanged.

Limitations:
- No import resolver yet.
- No JSX render edges yet.
- No call graph or production graph builder yet.
- No graph repository or UI changes.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed, exit `0`.
- `npm run build -w @lutest/contracts` — passed, exit `0`.
- `npm run build -w @lutest/worker-node` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed, exit `0`.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed, exit `0`.
- Boundary search: no adapter/classification imports or exports remain in `extract-symbols.ts`.
- PowerShell emitted npm/npx shim `Test-Path : Access is denied` warnings after commands; explicit exit markers were all `0`.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.4 — Source extractor architecture cleanup

Status: Done
Updated: 2026-06-30

Architecture status:
- New canonical source extractor layer exists at `apps/worker-node/src/modules/graph/source-extractors/`.
- TS/JS extractor lives under `source-extractors/ts-js/`.
- Old `apps/worker-node/src/modules/graph/ast/` files remain as deprecated compatibility re-exports only.
- `/api/graph`, graph repository, UI, and scan flow response shape were not changed.

Files changed:
- `apps/worker-node/src/modules/graph/source-extractors/source-extractor.types.ts`
- `apps/worker-node/src/modules/graph/source-extractors/source-extractor-registry.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js.types.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/parse-ts-js-source-file.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/extract-ts-js-symbols.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/classify-extracted-source-file.ts`
- `apps/worker-node/src/modules/graph/adapters/classify-parsed-source-file.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts`
- `apps/worker-node/src/modules/graph/ast/ast.types.ts`
- `apps/worker-node/src/modules/graph/ast/parse-source-file.ts`
- `apps/worker-node/src/modules/graph/ast/extract-symbols.ts`
- `apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts`
- `docs/plan/production-refactor-progress.md`

TS/JS extractor support:
- Supported extensions: `.ts`, `.tsx`, `.js`, `.jsx`.
- Unsupported extensions currently return `kind: "unsupported"`, `language: "unsupported"`, empty `symbols`, and parse diagnostic `Unsupported source file type: <filePath>`.
- `.vue` and `.php` are intentionally unsupported in this phase and do not throw during normal extraction.

Dependency direction:
- Source extractor layer does not import framework adapters.
- Framework adapter layer imports source extractor types through `source-extractors/source-extractor.types.ts`.
- Classification helper `classify-extracted-source-file.ts` composes `ExtractedSourceFile` + `FrameworkAdapter`.

Type rename status:
- New source types added: `RawSourceSymbol`, `RawSymbolKind`, `ExtractedSourceFile`, `ClassifiedSourceSymbol`, `GraphConfidence`.
- Framework adapter now uses `RawSourceSymbol` and `GraphConfidence`.
- Compatibility aliases remain for old names: `RawAstSymbol`, `RawAstSymbolKind`, `AstSymbolDeclaration`, `AstConfidence`, `ParsedSourceFile`.

Self-check coverage:
- `.tsx ProductCard` produces raw symbol with `pascalCase: true` and `hasJsx: true`.
- `useProducts` produces `hookName: true`.
- `getProducts` with `fetch('/api/products')` records direct network target `/api/products`.
- `.vue` file returns unsupported result without crash.
- `.php` file returns unsupported result without crash.
- Next adapter still classifies extracted TSX symbols.
- React adapter still classifies extracted TSX symbols.
- Deprecated `ast/` compatibility self-check still passes.

Removed:
- No runtime behavior was removed.
- Old `ast/` implementation bodies were replaced with compatibility re-exports.
- `classify-parsed-source-file.ts` implementation body was replaced with compatibility re-exports to `classify-extracted-source-file.ts`.

Limitations:
- No real Vue extractor yet.
- No real PHP extractor yet.
- No import resolver changes.
- No JSX render edges, call graph, production graph response builder, `/api/graph` response change, UI change, or Playwright work.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/ast/ast-symbol.self-check.ts` — passed.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.1.5 — Source extractor and adapter correctness cleanup

Status: Done
Updated: 2026-06-30

Unsupported handling:
- `parse-ts-js-source-file.ts` no longer falls back to `ts.ScriptKind.TS` for unsupported files.
- Unsupported TS/JS parse now returns `sourceFile: null` and diagnostic `Unsupported TS/JS source file type: <filePath>`.
- Normal scan path still does not throw for unsupported source files.

`.d.ts` handling:
- `tsJsSourceExtractor.supports(filePath)` now excludes `*.d.ts`.
- `parseTsJsSourceFile` treats `*.d.ts` as unsupported.
- Self-check covers `next-env.d.ts` and `src/types/global.d.ts`.

Raw symbol ID uniqueness:
- Raw symbol IDs now include source location: `raw:<kind>:<file>#<name>@<startLine>-<endLine>`.
- Duplicate methods with the same name in the same file now produce deterministic distinct IDs.

Classified symbol ID uniqueness:
- Classified symbol IDs now derive from raw symbol IDs: `<classifiedKind>:<rawSymbolId>`.
- Duplicate classified symbols with the same name now stay distinct if raw source symbols are distinct.

Nested symbol contamination fix:
- JSX and direct network scans now stop at nested function/class/method/arrow/function-expression boundaries.
- Parent functions are no longer marked `hasJsx` or `hasDirectNetworkCall` only because nested functions/classes contain JSX/fetch.

Adapter classification priority:
- React and Next adapters now classify page/component/hook identities before `api-client-method`.
- `api-client-method` now requires `hasDirectNetworkCall && !hasJsx`.
- React page/component with fetch remains page/component.
- Next component with fetch remains component.
- Hook with fetch remains hook.
- Unknown adapter remains conservative but does not convert JSX components with fetch into API client methods.

Registry-based extraction/classification:
- `classify-extracted-source-file.ts` now uses `sourceExtractorRegistry.extract(...)` in `extractAndClassifySymbols`.
- The classification helper no longer hardcodes the TS/JS extractor, keeping future Vue/PHP extractors pluggable.

DirectNetworkTarget decision:
- `DirectNetworkTarget.client` changed from TS/JS-only string union to `string` because source extractor types are shared across future languages.

Self-check coverage:
- `.tsx` component yields `pascalCase=true` and `hasJsx=true`.
- Hook yields `hookName=true`.
- Direct fetch records target.
- `.vue` and `.php` return unsupported without crash.
- `.d.ts` returns no source symbols.
- Duplicate class methods produce unique raw IDs.
- Duplicate classified component symbols produce unique classified IDs.
- Parent symbol not contaminated by nested fetch/JSX.
- React/Next page/component with fetch is not classified as `api-client-method`.
- `vite-react` maps to `reactAdapter`.
- Unknown/default adapter remains conservative.

Limitations:
- No import resolver changes.
- No JSX render edges.
- No call graph.
- No ProductionGraphResponse builder.
- No graph service migration.
- No `/api/graph` response shape change.
- No UI or Playwright work.
- No real Vue/PHP extractor.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

Next phase:
- R5.2 — Import extraction + resolver.

### R5.1.5 addendum — Graph service guard

Status: Verified
Updated: 2026-06-30

Guard result:
- `apps/worker-node/src/modules/graph/graph.service.ts` remains the legacy `/api/graph` builder.
- Return type is still `GraphResponse` from `@lutest/contracts`.
- It still builds legacy `GraphNode` / `GraphEdge` objects.
- It still uses `frameworkAdapterRegistry.getLegacyAdapterForProject(...)`.
- It still uses `LegacyFrameworkAdapter`.
- It still uses `detectSymbols(...)` for legacy symbol hints.
- It still uses `IMPORT_REGEX` and local relative import candidates for legacy import edges.
- It does not import or return `ProductionGraphResponse`.
- It does not import `sourceExtractorRegistry`.
- It does not use the new source extractor architecture directly.
- It does not use a production import resolver.

Decision:
- No runtime code change required.
- Keep `graph.service.ts` stable until R5.2–R5.5 introduce production extractor/resolver/graph-builder modules separately.

Tests/checks:
- Guard verified by reading `apps/worker-node/src/modules/graph/graph.service.ts` and searching for production graph/source-extractor/resolver imports.
- No new test run required because no runtime files changed in this addendum.

### R5.1.5 verification rerun — Attachment 51ac0186

Status: Done
Updated: 2026-06-30

Result:
- No additional runtime code changes needed.
- R5.1.5 correctness cleanup was already present and verified again against the repeated attachment checklist.
- `graph.service.ts` remains legacy `GraphResponse` path and was not migrated.

Checklist verified:
- Unsupported TS/JS file handling does not parse as TypeScript.
- `.d.ts` is unsupported and produces no source symbols.
- Raw symbol IDs include location and are deterministic/unique.
- Classified symbol IDs derive from raw symbol IDs and are deterministic/unique.
- Nested function/class JSX/network calls do not contaminate parent symbol flags.
- React/Next/default adapters keep page/component/hook priority above `api-client-method`.
- `classify-extracted-source-file.ts` uses `sourceExtractorRegistry.extract(...)`.
- `DirectNetworkTarget.client` is generic `string`.
- `graph.service.ts` still uses legacy `GraphResponse`, `GraphNode`, `GraphEdge`, `LegacyFrameworkAdapter`, `detectSymbols`, and legacy `IMPORT_REGEX`.

Verification rerun:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

Next phase:
- R5.2 — Import extraction + resolver.

## R5.2 — Import extraction + resolver

Status: Done
Updated: 2026-07-04

Files created:
- `apps/worker-node/src/modules/graph/import-resolver/import-resolver.types.ts`
- `apps/worker-node/src/modules/graph/import-resolver/extract-ts-js-imports.ts`
- `apps/worker-node/src/modules/graph/import-resolver/tsconfig-paths.ts`
- `apps/worker-node/src/modules/graph/import-resolver/resolve-import-target.ts`
- `apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts`

Import kinds supported:
- `static-import`
- `type-import`
- `side-effect-import`
- `export-from`
- `require`
- `dynamic-import` when argument is a string literal

Resolver capabilities:
- Relative imports: `./Button`, `../lib/api`.
- Exact source candidates.
- Extension candidates: `.ts`, `.tsx`, `.js`, `.jsx`.
- Index candidates: `index.ts`, `index.tsx`, `index.js`, `index.jsx`.
- External package imports are extracted but return `resolved: false`, `reason: "external-package"`.
- Non-code imports such as `.css` are extracted but not resolved as TS/JS source.

TS config support:
- Reads `tsconfig.json` or `jsconfig.json` from project root.
- Supports `compilerOptions.baseUrl`.
- Supports `compilerOptions.paths`, including `@/*` and aliases such as `@lib/*`.
- Missing config is handled as conservative fallback.
- Malformed config returns diagnostics and does not throw in normal resolver flow.
- Paths normalize Windows separators to `/`.

Unresolved import behavior:
- Missing target returns `resolved: false`, `targetFilePath: null`, `reason: "target-not-found"`.
- External packages return `reason: "external-package"`.
- Malformed config returns `reason: "config-invalid"` when provided to resolver.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` was not migrated.
- `/api/graph` legacy `GraphResponse` shape remains unchanged.
- Legacy regex import resolver remains in `graph.service.ts` until production graph builder phases.

Self-check coverage:
- Relative import `./Button` resolves to `Button.tsx`.
- Relative index import `./components` resolves to `components/index.ts`.
- Alias `@/components/Button` resolves through `@/*`.
- Alias `@lib/*` resolves to `src/lib/*`.
- `export-from` is detected.
- `require("./legacy")` is detected.
- `dynamic import("./lazy")` is detected.
- External import `react` is unresolved with `external-package`.
- CSS import is extracted and does not crash.
- Missing target returns `target-not-found`.
- Malformed tsconfig does not crash.

Limitations:
- Resolver is internal only; no production graph edges are built yet.
- No `GET /api/graph` response change.
- No `ProductionGraphResponse` builder.
- No render/call/http edges.
- No UI or Playwright changes.
- No Vue/PHP import extraction.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- Optional `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- Optional `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed.
- Optional `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — failed on pre-existing outside-root expectation; not part of R5.2 import resolver scope.

Next phase:
- R5.3 — Production project symbol scan / production node builder.

## R5.3 — Production project symbol scan / production node builder

Status: Done
Updated: 2026-07-04

Files created:
- `apps/worker-node/src/modules/graph/production/production-project-scanner.ts`
- `apps/worker-node/src/modules/graph/production/production-node-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`

Scanner behavior:
- Lists TS/JS source files under project root.
- Ignores `node_modules`, `.git`, `dist`, `build`, `.next`, `.lutest`, `coverage`.
- Ignores `.d.ts`, `.test.*`, `.spec.*`, `.stories.*`.
- Reads file content and uses `sourceExtractorRegistry.extract(...)`.
- Uses `frameworkAdapterRegistry.getAdapterForProject(rootDir)` unless framework override is passed.
- Classifies symbols through `classifyExtractedSourceFile(...)`.
- Does not hardcode Next in scanner; framework logic stays in adapters.

Node kinds supported:
- `file`
- `page`
- `component`
- `hook`
- `api-route`
- `api-client-method`
- `utility`

Summary behavior:
- Builds `fileCount`, `pageCount`, `componentCount`, `hookCount`, `apiRouteCount`, `apiClientMethodCount`, `externalEndpointCount`, `edgeCount`.
- R5.3 sets `externalEndpointCount = 0` because endpoint nodes are not built yet.
- R5.3 sets `edgeCount = 0` because edges are intentionally left for R5.4+.

Validation behavior:
- Internal builder returns `ProductionGraphResponse` with `mode: "symbol-level"`.
- Builder validates output with `validateProductionGraphResponse(...)` before returning.
- Builder throws if validation fails.

Route metadata:
- Basic Next route metadata added for App Router and Pages Router:
  - `app/page.tsx` -> `/`
  - `app/products/page.tsx` -> `/products`
  - `app/api/products/route.ts` -> `/api/products`
  - `pages/about.tsx` -> `/about`
  - `pages/api/users.ts` -> `/api/users`

Self-check coverage:
- Mini Next project checks page/component/api-route/api-client-method/hook nodes.
- Mini Next project verifies `.d.ts` and `.test.tsx` do not produce nodes.
- Mini Next project verifies basic route metadata.
- Mini React/Vite project checks page/component/api-client-method/hook nodes.
- Both graphs validate with `validateProductionGraphResponse(...)`.

What remains:
- No import/render/call/http edges yet.
- No `external-endpoint` nodes yet.
- No `/api/graph` response change.
- No `graph.service.ts` migration.
- No UI or Playwright work.
- No Vue/PHP production scanning.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` stayed legacy `GraphResponse` path.
- R5.3 did not change `/api/graph` response shape.

Known unrelated issue:
- Command: `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts`
- Result: `PATH_POLICY_HTTP_SELF_CHECK_EXIT_1`.
- Error summary: `AssertionError [ERR_ASSERTION]: GET /api/project outsideRoot should return 400 or 403` at `path-policy.http-self-check.ts:37`.
- Why unrelated to R5.3: R5.3 only adds internal production graph scanner/node builder modules and does not modify project/report/path HTTP controllers or path policy.
- Owner phase to fix later: path policy hardening/regression phase, not production graph node builder.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- Optional `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- Optional `npx tsx ./apps/worker-node/src/modules/report/report-integrity.self-check.ts` — passed.
- Optional `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — failed as known unrelated issue above.

Next phase:
- R5.4 — Production edges: import/render/call/http.

## R5.3.1 — Production scanner/framework boundary cleanup

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/source-extractors/source-extractor.types.ts`
- `apps/worker-node/src/modules/graph/source-extractors/source-extractor-registry.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/classify-extracted-source-file.ts`
- `apps/worker-node/src/modules/graph/adapters/next-js-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/react.adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-project-scanner.ts`
- `apps/worker-node/src/modules/graph/production/production-node-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Boundary cleanup:
- Removed production scanner hardcoded `SOURCE_EXTENSIONS`.
- Added/used `sourceExtractorRegistry.getExtractor(filePath)` and `sourceExtractorRegistry.isSupportedSourceFile(filePath)` discovery API.
- Moved production route metadata ownership to framework adapters.
- `ClassifiedGraphSymbol` and `ClassifiedSourceSymbol` now carry optional `route` metadata.
- `production-node-builder.ts` now consumes `symbol.route`; it no longer owns Next App Router or Pages Router route logic.
- `tsJsSourceExtractor.supports()` owns TS/JS inclusion rules and excludes `.d.ts`, `.test.*`, `.spec.*`, `.stories.*`.

Route metadata:
- Next adapter returns page route metadata for App Router and Pages Router pages.
- Next adapter returns API route metadata for App Router `route.*` handlers and Pages API files.
- React adapter returns page route metadata for `pages` / `routes` page components.
- Component/hook/api-client symbols do not receive route metadata.

Self-check coverage:
- Scanner discovers supported files via source extractor registry behavior.
- `.d.ts`, `.test.*`, `.spec.*`, `.stories.*` are excluded through extractor support rules.
- Next `app/page.tsx`, `app/products/page.tsx`, `app/api/products/route.ts`, `pages/index.tsx`, and `pages/api/users.ts` route metadata covered.
- React `src/pages/Home.tsx` route metadata covered.
- Production graph still validates `ProductionGraphResponse` and edge count remains zero.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- Legacy `/api/graph` still returns `GraphResponse`.
- Legacy path still uses `getLegacyAdapterForProject`, `detectSymbols`, and legacy import regex behavior.

Remaining limitations:
- No import/render/call/http edges yet.
- No external endpoint nodes yet.
- No production graph endpoint exposure yet.
- No Vue/PHP source extractor or framework adapter yet.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.

Next phase:
- R5.4 — Production edges: import/render/call/http.

## R5.3.2 — Production node ID and adapter route correctness

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/adapters/next-js-adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/react.adapter.ts`
- `apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Node ID convention:
- `ProductionGraphNode.id === ClassifiedSourceSymbol.id` for symbol nodes.
- `production-node-builder.ts` already uses `symbol.id`; self-check now verifies no double prefix such as `component:component:`, `page:page:`, or `api-route:api-route:`.
- This keeps future edge targets able to reference classified symbol IDs directly.

Next route fixes:
- Route derivation now uses `app` / `pages` segment index instead of `startsWith("app/")` or `startsWith("pages/")`.
- `src/app/page.tsx` maps to `/`.
- `src/app/products/page.tsx` maps to `/products`.
- `src/app/products/route.ts` maps to `{ path: "/products", kind: "api" }`.
- `src/pages/about.tsx` maps to `/about`.
- `src/pages/api/users.ts` maps to `{ path: "/api/users", kind: "api" }`.
- Route metadata remains attached only to page and api-route symbols.

React priority fix:
- React classify order is now hook -> page -> component with JSX -> component by component file/PascalCase -> api-client-method -> utility.
- PascalCase component files with direct `fetch()` but no JSX remain components.
- Service functions with direct `fetch()` remain api-client-method.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- Legacy `/api/graph` still returns `GraphResponse`.
- No R5.4 edges added in this phase.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.4 — Production edges: import/render/call/http.

## R2.2 — Path policy selected project root fix

Status: completed.

Files changed:
- `apps/worker-node/src/shared/services/path-policy.service.ts`
- `apps/worker-node/src/shared/services/path-policy.http-self-check.ts`
- `docs/plan/production-refactor-progress.md`

Investigation before fix:
- Request URL: `GET /api/project?path=<outsideRoot>`.
- Query passed: `path=C:\Users\DDML\AppData\Local\Temp\lutest-r22-probe-1Pqnud\outside`.
- `allowedRoot` in probe: `C:\Users\DDML\AppData\Local\Temp\lutest-r22-probe-1Pqnud\allowed`.
- `outsideRoot` in probe: `C:\Users\DDML\AppData\Local\Temp\lutest-r22-probe-1Pqnud\outside`.
- Actual status before fix: `200`.
- Actual response body before fix: project summary for `outside`, with `rootDir` pointing at outside root and `packageJsonExists: false`.

Root cause:
- `pathPolicyService.assertProjectRoot()` resolved the configured selected project root, then resolved explicit request path, but outside-root and blocked-segment guards were commented out.
- Because those guards were disabled, explicit outside paths were accepted and downstream `/api/project` returned `200` instead of `PATH_NOT_ALLOWED`.

Allowed root semantics after fix:
- `allowedRoot` comes from `LUTEST_PROJECT_PATH`, then legacy `PROJECT_PATH`, then dev fallback `process.cwd()` only when no explicit project root env exists.
- Selected project root may be outside Lutest repo and outside worker cwd.
- No request path means selected `allowedRoot` is used.
- Explicit request path must resolve to a directory inside or equal to selected `allowedRoot`.
- Explicit outside path returns `PATH_NOT_ALLOWED`; no silent fallback to selected root.

`/api/project` behavior after fix:
- `GET /api/project` succeeds using selected `allowedRoot`.
- `GET /api/project?path=<allowedRoot>` succeeds.
- `GET /api/project?path=<allowedRoot>/src` succeeds when child directory exists.
- `GET /api/project?path=<outsideRoot>` returns `400` or `403` with `PATH_NOT_ALLOWED`.

Self-check coverage:
- HTTP self-check covers `/api/project` no path, allowed root, allowed child, and outside root.
- HTTP self-check covers `/api/graph`, `/api/report/latest`, and `POST /api/actions/scan` outside-root rejection.
- Path service self-check proves worker cwd and selected project root can differ.
- Path policy service self-check covers allowed root, child root, sibling/outside root, missing root, and blocked generated path.

What was not changed:
- No R5.4 edges.
- No production graph endpoint.
- No UI changes.
- No `graph.service.ts` migration.
- No source extractor changes.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.service.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path.service.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.4 — Production edges: import/render/call/http.

## R5.4.1 — Production import edges

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/production/production-edge-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Import edge source/target convention:
- Source is file node id: `file:<relativePath>`.
- Target is resolved internal source file node id: `file:<relativePath>`.
- R5.4.1 intentionally does not target component/function symbols because import binding/export symbol resolution is out of scope.

Resolver usage:
- Import extraction uses `extractTsJsImports(...)` from `apps/worker-node/src/modules/graph/import-resolver/`.
- Target resolution uses `resolveImportTarget(...)` and `readTsconfigPathSettings(...)` from the same import resolver module.
- No legacy regex import resolver from `graph.service.ts` is used.

Duplicate edge handling:
- Edge ids are deterministic: `import:<source>-><target>`.
- Edges are stored in a map by id, so repeated imports from the same source file to the same target file collapse into one edge.

Unresolved import behavior:
- External package imports such as `react` do not create internal edges.
- CSS/asset imports such as `./globals.css` do not crash and do not create internal edges unless a supported source file node exists.
- Missing imports do not create edges.

Self-check coverage:
- `app/page.tsx` relative import to `components/ProductCard.tsx` creates an import edge.
- Alias import `@/components/ProductCard` resolves through `tsconfig.json` paths and creates an import edge.
- Index import `../components` resolves to `components/index.ts` and creates an import edge.
- Duplicate imports do not create duplicate edges.
- External import `react` and CSS import `../globals.css` do not create internal edges.
- `ProductionGraphResponse` validates and `summary.edgeCount === edges.length`.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- `/api/graph` still uses legacy `GraphResponse` path.

What remains:
- No render edges.
- No call edges.
- No HTTP edges.
- No external-endpoint nodes.
- No production graph HTTP endpoint.
- No UI graph migration.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.4.2 — JSX render edges.

## R5.4.2 — JSX render edges

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/production/production-edge-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Extraction strategy:
- JSX usage extraction uses the TypeScript AST, not regex.
- It reads `JsxSelfClosingElement` and `JsxOpeningElement` tags.
- Native lowercase tags such as `main`, `section`, `button`, and fragments are ignored.
- Custom PascalCase tags such as `ProductCard` and conservative property tags such as `Cards.ProductCard` are considered.

Source/target node convention:
- Render edge source is the classified `page` or `component` symbol whose `loc` contains the JSX usage line.
- Render edge target is a classified `component` symbol.
- Edge id is deterministic: `render:<sourceSymbolId>-><targetSymbolId>`.

Import-aware mapping supported:
- Same-file component lookup is supported.
- Default imports are supported when the target file has matching/single component evidence.
- Named imports such as `import { ProductCard } from "./ProductCard"` are supported.
- Namespace imports have conservative support for `Namespace.Component` when target file contains a matching component symbol.
- Global component-name fallback is used only when exactly one component symbol has that name.

Unsupported JSX patterns:
- Ambiguous duplicate component names are skipped unless import context resolves them.
- Complex re-export binding resolution is not expanded beyond existing import resolver/file evidence.
- Dynamic component variables and non-literal JSX factories are skipped.

Dedupe behavior:
- Render edges are stored in the same deterministic edge map as import edges.
- Multiple `<ProductCard />` usages inside the same source symbol create one render edge.

Self-check coverage:
- Page renders imported `ProductCard` and creates page -> component render edge.
- Page duplicate `<ProductCard />` usage dedupes.
- Page renders imported `ProductList` and creates page -> component render edge.
- `ProductList` renders `ProductCard` and creates component -> component render edge.
- Same-file `Parent` renders `Child` and creates component -> component render edge.
- Native HTML tags and unknown `MissingComponent` do not create bad edges.
- R5.4.1 import edges still exist.
- `ProductionGraphResponse` validates and `summary.edgeCount === graph.edges.length`.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- `/api/graph` still uses legacy `GraphResponse` path.

What remains:
- No call edges.
- No HTTP edges.
- No external-endpoint nodes.
- No production graph HTTP endpoint.
- No UI graph migration.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.4.3 — Call edges.

## R5.4.3 — Production call edges

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/production/production-edge-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Extraction strategy:
- Call usage extraction uses the TypeScript AST, not regex.
- It reads `CallExpression` nodes and records identifier calls such as `useProducts()` / `getProducts()` / `formatMoney()`.
- Conservative member calls such as `service.getProducts()` can map only when namespace import context points to a target file and matching symbol.

Source/target node convention:
- Call edge source is the classified `page` or `component` symbol whose `loc` contains the call expression line.
- Call edge target is a classified `hook`, `api-client-method`, `utility`, or callable `component` symbol.
- Edge id is deterministic: `call:<sourceSymbolId>-><targetSymbolId>`.

Local/imported call mapping supported:
- Same-file calls map by classified symbol name.
- Named imports map by imported/local name to target file classified symbols.
- Default imports map to matching or single callable symbol in target file.
- Namespace imports have conservative support for `Namespace.member()`.
- Global fallback is used only when exactly one callable symbol has the called name.

Skipped call patterns:
- Unknown calls are skipped.
- Built-ins such as `console.log`, `setTimeout`, `Promise.all`, and array iterator methods are skipped.
- Direct network clients such as `fetch`, `axios`, `ky`, and `ofetch` are skipped for call edges; R5.4.4 will own HTTP edges.
- JSX render usage remains render-only and does not create call edges.

Dedupe behavior:
- Call edges share the same deterministic edge map as import/render edges.
- Multiple `getProducts()` calls from the same source symbol to the same target symbol produce one call edge.

Self-check coverage:
- Page calls imported `useProducts()` and creates page -> hook call edge.
- `ProductCard` calls same-file `formatMoney()` and creates component -> utility call edge.
- `ProductList` calls imported `getProducts()` twice and creates one component -> api-client-method call edge.
- Same-file `Parent` calls `helper()` and creates component -> utility call edge.
- `missingFunction()`, built-ins, and direct `fetch()` do not create bad call edges.
- JSX `<ProductCard />` still creates render edge and no call edge.
- R5.4.1 import edges and R5.4.2 render edges still exist.
- `ProductionGraphResponse` validates and `summary.edgeCount === graph.edges.length`.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- `/api/graph` still uses legacy `GraphResponse` path.

What remains:
- No HTTP edges.
- No external-endpoint nodes.
- No production graph HTTP endpoint.
- No UI graph migration.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.4.4 — HTTP edges + external-endpoint nodes.

## R5.4.4 — HTTP edges + external-endpoint nodes

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/source-extractors/source-extractor.types.ts`
- `apps/worker-node/src/modules/graph/adapters/classify-extracted-source-file.ts`
- `apps/worker-node/src/modules/graph/production/build-http-edges.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Direct network target source:
- HTTP graph building uses `ClassifiedSourceSymbol.directNetworkTargets`, preserved from raw TS/JS source extraction.
- `ClassifiedSourceSymbol` now carries `rawSymbolId`, `hasDirectNetworkCall`, and `directNetworkTargets` so HTTP builder does not parse data back out of `symbol.id`.

External endpoint node convention:
- Endpoint node kind is `external-endpoint`.
- Endpoint node id is `external-endpoint:<METHOD>:<target>`.
- Endpoint node name is `<METHOD> <target>`.
- Endpoint node `http` stores `{ method, path }`.
- `fetch(...)` and `ofetch(...)` default to `GET` when method is not explicit.
- `axios.<method>(...)` and `ky.<method>(...)` preserve uppercased method when extracted.

HTTP edge convention:
- Edge kind is `http`.
- Source is the classified symbol node that owns the direct network target.
- Target is the external-endpoint node.
- Edge id is deterministic: `http:<sourceSymbolId>-><endpointNodeId>`.

Dedupe behavior:
- Duplicate endpoint targets collapse into one external-endpoint node.
- Duplicate network calls from the same symbol to the same endpoint collapse into one HTTP edge.
- Same endpoint used by different symbols creates one endpoint node and multiple HTTP edges.

Unsupported network patterns:
- Non-static/dynamic targets remain skipped by existing extractor behavior.
- Indirect client wrappers such as `api.get(...)` remain future work unless direct extractor support exists.

Edge builder structure:
- HTTP node/edge logic is split into `apps/worker-node/src/modules/graph/production/build-http-edges.ts`.
- `production-edge-builder.ts` remains responsible for import/render/call edge orchestration and does not own HTTP node creation.

Self-check coverage:
- API client method with duplicate `fetch("/api/products")` creates one endpoint node and one HTTP edge for that symbol.
- Page direct `fetch("/api/products")` creates page -> endpoint HTTP edge.
- `axios.post("/api/orders")` creates `POST /api/orders` endpoint and HTTP edge.
- `ky.get("/api/products")` creates HTTP edge to shared `GET /api/products` endpoint.
- Same endpoint used by multiple symbols shares one endpoint node.
- Import/render/call edges from R5.4.1–R5.4.3 still exist.
- `summary.externalEndpointCount` matches external endpoint nodes.
- `summary.edgeCount === graph.edges.length`.
- `ProductionGraphResponse` validates.

Graph service guard:
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- `/api/graph` still uses legacy `GraphResponse` path.

What remains:
- No production graph HTTP endpoint exposure yet.
- No `/api/graph` response migration.
- No UI graph migration.
- No Playwright work.
- No Vue/PHP extractor work.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.5 — Production graph exposure strategy / endpoint decision.

## R5.5 — Production graph exposure endpoint

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/graph.routes.ts`
- `apps/worker-node/src/modules/graph/graph.controller.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts`
- `packages/contracts/src/index.ts`
- `docs/plan/production-refactor-progress.md`

Endpoint added:
- Added `GET /api/graph/production`.
- Endpoint returns `ProductionGraphResponse` with `mode: "symbol-level"`.
- Endpoint calls `buildProductionGraph({ rootDir })`, then validates with `validateProductionGraphResponse(...)` before response.
- Invalid production graph validation returns standard worker `INTERNAL_ERROR` JSON through `HttpError` / error middleware.

Legacy `/api/graph` unchanged:
- `GET /api/graph` still calls legacy `graphService.buildAndSaveGraph(...)`.
- Legacy response shape is not migrated and does not return `mode: "symbol-level"`.
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.

Path-policy behavior:
- Production endpoint uses `getValidatedProjectPath(req, res, validateGraphQuery)` like legacy graph/report/project endpoints.
- No query path uses selected `allowedRoot`.
- `path=<allowedRoot>` succeeds.
- `projectPath=<allowedRoot>` succeeds as alias for production graph query.
- Explicit outside path returns `400` or `403` with `PATH_NOT_ALLOWED`; no silent fallback.

Validation behavior:
- HTTP self-check validates response via `validateProductionGraphResponse(...)`.
- Builder still validates internally before returning graph.
- Endpoint validates again before sending response.

Self-check coverage:
- `GET /api/graph/production` no path returns `200` and `mode: "symbol-level"`.
- Production response validates and contains page/component/api-route/api-client-method/external-endpoint nodes.
- Production response contains import/render/call/http edges.
- `summary.edgeCount === edges.length`.
- `GET /api/graph/production?path=<allowedRoot>` returns `200`.
- `GET /api/graph/production?projectPath=<allowedRoot>` returns `200`.
- `GET /api/graph/production?path=<outsideRoot>` returns `PATH_NOT_ALLOWED`.
- `GET /api/graph` remains legacy and does not return `mode: "symbol-level"`.

What remains:
- UI still uses legacy graph.
- No `/api/graph` response migration yet.
- No Playwright work.
- No Vue/PHP extractor work.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.6 — UI production graph integration plan / migration.

## R5.6 — UI production graph integration

Status: completed.

Files changed:
- `apps/ui/src/lib/api-client.ts`
- `apps/ui/src/lib/use-dashboard-data.ts`
- `apps/ui/src/lib/production-graph-adapter.ts`
- `apps/ui/src/lib/production-graph-adapter.self-check.ts`
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/next.config.ts`
- `apps/ui/tsconfig.json`
- `docs/plan/production-refactor-progress.md`

Client/API changes:
- Added `lutestApi.getProductionGraph(projectPath?)` for `GET /api/graph/production`.
- Production graph response is runtime-validated with `validateProductionGraphResponse(...)` before UI use.
- Legacy `lutestApi.getGraph(projectPath?)` remains pointed at `GET /api/graph`.

Adapter changes:
- Added `adaptProductionGraphToUiGraph(...)` for `ProductionGraphResponse -> UiGraphModel`.
- Adapter maps production node/edge types without framework route inference.
- Adapter preserves `node.route` metadata from backend output.
- Adapter self-check covers node mapping, edge mapping, endpoint label, summary counts, contract validation, and no source mutation.

Dual-mode UI strategy:
- Default graph mode is `legacy` unless `NEXT_PUBLIC_LUTEST_GRAPH_MODE=production`.
- Dashboard has a small `legacy` / `production` toggle.
- Legacy mode renders existing `ProviderGrid` and `GraphPanel` from legacy `GraphResponse`.
- Production mode fetches only `/api/graph/production` and renders production summary/panel from the adapted model.

Build cleanup:
- Fixed existing UI report-state assumptions to match `LatestReportResponse` contract.
- Disabled typed routes in `apps/ui/next.config.ts` and removed stale `.next/dev/types` cache after generated route types were corrupt.
- `apps/ui/tsconfig.json` may still be auto-updated by Next to include `.next/dev/types/**/*.ts` during build.

Not changed:
- `GET /api/graph` legacy behavior unchanged.
- `apps/worker-node/src/modules/graph/graph.service.ts` unchanged.
- No worker production graph builder changes.
- No Playwright work.
- No Vue/PHP extractor work.
- No large UI layout rewrite.

Known limitations:
- Production UI is a minimal symbol-level list view, not visual grouping/layout hardening.
- Production mode does not migrate existing graph visualization semantics beyond summary columns.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but checked commands exited `0`.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed after clearing corrupt `.next/dev` cache.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.

Next phase:
- R5.7 — Production graph UI hardening / visual grouping

## R5.6.1 — UI selected project path sync fix

Status: completed.

Files changed:
- `apps/ui/.env`
- `apps/ui/src/lib/api-client.ts`
- `apps/ui/src/lib/use-dashboard-data.ts`
- `apps/ui/src/lib/dashboard-data-request.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Root cause:
- `apps/ui/.env` set `NEXT_PUBLIC_LUTEST_PROJECT_PATH=D:\Projects\lutest\apps\ui`.
- UI hook used `NEXT_PUBLIC_LUTEST_PROJECT_PATH` as default `projectPath`.
- Every project/graph/report request therefore sent `?path=D:\Projects\lutest\apps\ui`.
- When worker `allowedRoot` was `D:\Projects\lutest`, path-policy rejected that explicit UI app path in the failing dev run.

Selected project root behavior:
- Removed wrong `NEXT_PUBLIC_LUTEST_PROJECT_PATH` from `apps/ui/.env`.
- If no UI project path is configured, UI calls `GET /api/project` without `path`.
- Worker remains source of truth for selected root via its allowed root / path-policy flow.
- Follow-up graph/report requests omit `path` when no explicit UI path is configured.
- If `NEXT_PUBLIC_LUTEST_PROJECT_PATH` is explicitly configured, UI still sends that exact path and lets worker path-policy accept/reject it.

PATH_NOT_ALLOWED behavior:
- API client now parses standard `{ error: { code, message } }` responses.
- UI maps `PATH_NOT_ALLOWED` to `Selected path is outside worker allowed root`.
- UI does not silently fallback to empty graph on path-policy errors.

Worker offline behavior:
- Dashboard load checks `/api/status` first and stores status before project/graph/report loading.
- `PATH_NOT_ALLOWED` is treated as selected-path error, not worker-offline state.
- Worker offline remains represented by status fetch failure / unreachable worker.

Not changed:
- Path policy was not loosened.
- Arbitrary outside paths are still rejected by worker.
- Legacy `/api/graph` response unchanged.
- Production `/api/graph/production` response unchanged.
- No R5.7 visual grouping work.

Self-check coverage:
- No configured UI path calls `/api/project` without query.
- Explicit child path is encoded into legacy `/api/graph?path=...`.
- Production mode calls `/api/graph/production?path=...`.
- `PATH_NOT_ALLOWED` JSON maps to typed `ApiClientError` and path error detection.
- Legacy and production endpoint routing remain separate.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-data-request.self-check.ts` — passed.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.7 — Production graph UI hardening / visual grouping

## R5.6.3 — Strict production graph accuracy audit for apps/ui

Status: completed.

Audited root:
- `D:/Projects/lutest/apps/ui`

Files changed:
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `docs/plan/production-refactor-progress.md`

Generated audit output:
- `apps/ui/.lutest/audits/production-graph-accuracy-apps-ui.json`

Expected inventory counts:
- Supported files: 9
- Pages: 1
- Components: 18
- Hooks: 1
- API client candidates: 6
- Endpoint candidates: 6

Actual production graph counts:
- Files: 9
- Pages: 1
- Components: 18
- Hooks: 1
- API client methods: 0
- External endpoints: 0
- Edges: 32

Mismatches:
- Missing API client methods: `lutestApi.getStatus`, `lutestApi.getProject`, `lutestApi.getGraph`, `lutestApi.getProductionGraph`, `lutestApi.getLatestReport`, `lutestApi.runScan`.
- Missing endpoint candidates: `/api/status`, `/api/project`, `/api/graph`, `/api/graph/production`, `/api/report/latest`, `/api/actions/scan`.
- Missing HTTP edges for all six API client method -> endpoint pairs.
- File/page/component/hook inventory matched expected independent AST audit.

Root causes:
- Production extractor/classifier likely does not emit exported object literal methods as `api-client-method` symbols.
- HTTP endpoint extraction likely only sees direct network calls on classified symbols; `apps/ui/src/lib/api-client.ts` wraps endpoint strings behind `requestJson(...)` and `requestProductionGraph(...)` indirection.

Verdict:
- `PASS_WITH_KNOWN_LIMITATIONS`

Recommended next fix phase:
- `R5.6.4 — API client object-method and indirect HTTP detection`

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — failed existing path-policy assertion: outside path was not rejected.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — failed existing path-policy assertion: outside path did not return 400/403.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS_WITH_KNOWN_LIMITATIONS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied` before commands.

Audit-only guard:
- No detector changed.
- No adapter changed.
- No graph builder changed.
- No UI source changed in this phase.
- No `/api/graph` or `/api/graph/production` response changed.

Next phase:
- R5.6.4 — API client object-method and indirect HTTP detection

## R2.3 — Path policy self-check isolation / regression fix

Status: completed.

Files changed:
- `apps/worker-node/src/shared/services/path-policy.service.ts`
- `apps/worker-node/src/shared/http/validated-project-path.ts`
- `apps/worker-node/src/shared/services/path-policy.http-self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts`
- `docs/plan/production-refactor-progress.md`

Root cause:
- Real path-policy regression found: `isSubPath(allowed.rootDir, target.rootDir)` guard in `path-policy.service.ts` was commented out.
- Before fix, explicit outside path returned `200` instead of `PATH_NOT_ALLOWED`.
- Probe evidence before fix:
  - `process.cwd()` was `D:\Projects\lutest`.
  - `process.env.LUTEST_PROJECT_PATH` was temp allowed root.
  - `process.env.PROJECT_PATH` was unset.
  - `allowedRoot` was temp `...\lutest-r23-allowed-*`.
  - `outsideRoot` was temp `...\lutest-r23-outside-*`.
  - `GET /api/project?path=<outsideRoot>` returned `200` with outside project summary.
  - `GET /api/graph/production?path=<outsideRoot>` returned `200` with empty production graph.

Fix:
- Restored explicit outside-root rejection in `pathPolicyService.assertProjectRoot(...)`.
- Repaired `getValidatedProjectPath(...)` to use `path ?? projectPath`, preserving production graph `projectPath` alias behavior.
- Updated `path-policy.http-self-check.ts` to save/restore both `LUTEST_PROJECT_PATH` and `PROJECT_PATH`.
- Updated `path-policy.http-self-check.ts` to cover both explicit `LUTEST_PROJECT_PATH` mode and no-env fallback `cwd` mode.
- Updated `production-graph.http-self-check.ts` to isolate/restore `PROJECT_PATH` and improve outside-path assertion message.

After behavior:
- `GET /api/project?path=<outsideRoot>` returns `400` or `403` with `PATH_NOT_ALLOWED`.
- `GET /api/graph/production?path=<outsideRoot>` returns `400` or `403` with `PATH_NOT_ALLOWED`.
- Self-checks pass with normal terminal env.
- Self-checks pass when terminal has `LUTEST_PROJECT_PATH=D:\Projects\lutest\apps\ui`.

Not changed:
- No path-policy loosening.
- No `/api/graph` response shape change.
- No `/api/graph/production` response shape change.
- No source extractor, adapter, edge builder, or R5.6.4 work.

Tests/checks run:
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `$env:LUTEST_PROJECT_PATH="D:\Projects\lutest\apps\ui"; npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `$env:LUTEST_PROJECT_PATH="D:\Projects\lutest\apps\ui"; npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS_WITH_KNOWN_LIMITATIONS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands above exited `0`.

Next phase:
- R5.6.4 — API client object-method and indirect HTTP detection

## R5.6.4 — API client object-method and indirect HTTP detection

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/extract-ts-js-symbols.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/api-client-object-method.self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `docs/plan/production-refactor-progress.md`

Root cause:
- TS/JS extractor did not emit exported object literal methods as raw symbols with object context, so `lutestApi.getStatus`-style methods were invisible to production classification.
- Request helper calls such as `requestJson(withProjectPath("/api/project", projectPath))` were not recognized as HTTP targets because the first argument was an indirect static wrapper call, not a direct string literal.

Object method patterns supported:
- Exported object literal method shorthand: `export const api = { getUsers() { ... } }`.
- Exported object literal arrow/function properties: `export const api = { createUser: () => ... }`.
- Qualified symbol names are preserved, e.g. `lutestApi.getGraph`.
- Raw IDs remain deterministic with file path, qualified name, and loc range.
- Standalone duplicate object method symbols are avoided for exported object literal methods.

Helper request patterns supported:
- `requestJson("/api/...")`.
- `requestProductionGraph("/api/...")`.
- `apiRequest("/api/...")`.
- `request("/api/...")`.
- `this.request("/api/...")` / member `.request("/api/...")`.
- Static wrapper first argument, e.g. `requestJson(withProjectPath("/api/project", projectPath))`.
- `method: "POST"` in second argument is inferred; otherwise static helper calls default to `GET`.
- Direct `fetch("/api/...")` remains supported.

apps/ui before:
- API client methods: 0
- External endpoints: 0
- HTTP edges: 0
- Audit verdict: `PASS_WITH_KNOWN_LIMITATIONS`

apps/ui after:
- API client methods: 6
- External endpoints: 6
- HTTP edges: 6
- Total edges: 38
- Audit verdict: `PASS`

Endpoint nodes added:
- `GET /api/status`
- `GET /api/project`
- `GET /api/graph`
- `GET /api/graph/production`
- `GET /api/report/latest`
- `POST /api/actions/scan`

HTTP edges added:
- `lutestApi.getStatus -> GET /api/status`
- `lutestApi.getProject -> GET /api/project`
- `lutestApi.getGraph -> GET /api/graph`
- `lutestApi.getProductionGraph -> GET /api/graph/production`
- `lutestApi.getLatestReport -> GET /api/report/latest`
- `lutestApi.runScan -> POST /api/actions/scan`

Remaining limitations:
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred; HTTP detection was the main R5.6.4 target.
- Audit still marks import/render/call edge sections as not exhaustively audited in R5.6.3/R5.6.4 scope.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/ts-js-source-extractor.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/api-client-object-method.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/adapters/framework-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Not changed:
- Path policy unchanged in R5.6.4.
- `/api/graph` legacy response unchanged.
- `/api/graph/production` response shape unchanged.
- UI layout unchanged.
- No Vue/PHP extractor work.

Next phase:
- R5.7 — Production graph UI hardening / visual grouping

## R5.6.5 — Production graph cleanup: object-property false positives and alias import audit

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/extract-ts-js-symbols.ts`
- `apps/worker-node/src/modules/graph/source-extractors/ts-js/api-client-object-method.self-check.ts`
- `apps/worker-node/src/modules/graph/import-resolver/tsconfig-paths.ts`
- `apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `apps/ui/.lutest/audits/production-graph-accuracy-apps-ui.json`
- `docs/plan/production-refactor-progress.md`

Metadata false positive fix:
- Exported object literal extraction now emits only function-like members: shorthand methods, function properties, and arrow-function properties.
- Plain object value properties are skipped.
- `metadata.title` and `metadata.description` are no longer emitted as utility nodes.
- Self-check covers exported metadata string props and nested config value props as non-symbols.

Alias import edge result:
- Resolver now treats `paths` without explicit `baseUrl` as rooted at project root.
- This matches Next/TS usage in `apps/ui/tsconfig.json`, where `@/*` maps to `./src/*` without `baseUrl`.
- Alias import edges are now present:
  - `file:src/app/page.tsx -> file:src/components/dashboard-shell.tsx`
  - `file:src/components/dashboard-shell.tsx -> file:src/lib/production-graph-adapter.ts`
  - `file:src/components/dashboard-shell.tsx -> file:src/lib/use-dashboard-data.ts`
- Import resolver self-check covers `@/*` resolution without explicit `baseUrl`.

apps/ui after:
- False positive metadata nodes: 0
- Missing alias import edges: 0
- Import edges: 7
- API client methods: 6
- External endpoints: 6
- HTTP edges: 6
- Audit verdict: `PASS`

Not changed:
- `/api/graph` legacy response unchanged.
- `/api/graph/production` response shape unchanged.
- Path policy unchanged.
- UI layout unchanged.
- No Vue/PHP extractor work.

Known limitations:
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred.
- Audit still treats import/render/call sections as partially audited except required alias import edges.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/api-client-object-method.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.7 — Production graph UI hardening / visual grouping

## R5.7 — Interactive production graph canvas

Status: completed.

Files changed:
- `apps/ui/package.json`
- `package-lock.json`
- `apps/ui/src/app/globals.css`
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/components/production-graph-canvas.tsx`
- `apps/ui/src/components/production-graph-node.tsx`
- `apps/ui/src/components/production-graph-detail-panel.tsx`
- `apps/ui/src/lib/production-graph-adapter.ts`
- `apps/ui/src/lib/production-graph-layout.ts`
- `apps/ui/src/lib/production-graph-adapter.self-check.ts`
- `apps/ui/.lutest/audits/production-graph-accuracy-apps-ui.json`
- `docs/plan/production-refactor-progress.md`

Graph rendering library:
- Added `@xyflow/react` for interactive pan/zoom graph canvas.
- Added `elkjs` for layered graph layout.
- React Flow stylesheet imported through `apps/ui/src/app/globals.css`.

Layout strategy:
- ELK layered layout, direction `RIGHT`.
- Nodes are pre-sorted by kind: page, component, hook, api-client-method, external-endpoint, api-route, utility, file.
- Canvas height fixed at `32rem` to avoid horizontal page overflow.

Node/edge mapping:
- `ProductionGraphResponse` now maps to `ProductionFlowModel` with `nodes`, `edges`, `nodeMap`, `summary`, `nodesByKind`, and `edgesByKind`.
- React Flow node data includes label, kind, filePath, loc, route, http, confidence, and reason.
- React Flow edge data includes source, target, kind, label, confidence, and reason.
- Raw production graph is not mutated.

Filters:
- Edge filters added for import/render/call/http.
- Default visible: render, call, HTTP.
- Import edges are hidden by default but data remains available.

Detail panel:
- Node detail shows name, kind, filePath, loc, route/http, confidence, reason, incoming count, and outgoing count.
- Edge detail shows kind, source label, target label, confidence, and reason.

Legacy mode preserved:
- Legacy graph mode still renders old list panel from `GraphResponse`.
- Production mode renders the new canvas from `ProductionGraphResponse`.
- Fetch separation from R5.6 remains unchanged: legacy mode uses `/api/graph`, production mode uses `/api/graph/production`.

Encoding cleanup:
- Replaced dashboard mojibake glyphs with safe ASCII text/icons.

apps/ui audit after R5.7:
- Files: 13
- Pages: 1
- Components: 23
- Hooks: 1
- API client methods: 6
- External endpoints: 6
- HTTP edges: 6
- Total edges: 54
- Audit verdict: `PASS`

Known limitations:
- ELK uses kind pre-sort plus layered direction; hard fixed layer constraints are not implemented yet.
- Import/render/call audit remains partial except required alias imports.
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred to R5.8.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.8 — Object member call edges / dependency chain completion

## R5.7.1 — Production graph UI data mapping and layout cleanup

Status: completed.

Files changed:
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/components/production-graph-canvas.tsx`
- `apps/ui/src/components/production-graph-detail-panel.tsx`
- `apps/ui/src/lib/production-graph-adapter.ts`
- `apps/ui/src/lib/production-graph-adapter.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Header count fix:
- Production mode header now prefers `productionGraph.summary.fileCount`, then `project.sourceFileCount`, then `0`.
- Legacy mode keeps using `project.sourceFileCount`.

Summary cards mapping:
- Production summary cards now show source files, UI symbols, API flow, and edges/issues.
- API flow includes `apiClientMethodCount` and `externalEndpointCount` instead of relying on `apiRouteCount` only.
- Adapter UI summary now preserves `fileCount`, `hookCount`, `apiClientMethodCount`, `externalEndpointCount`, and `edgeCount`.

Canvas layout change:
- Production canvas now owns main dashboard width instead of sharing with large report panel.
- React Flow card uses a larger `min-height: 38.75rem` canvas and a compact side inspector.
- Edge toggles stay in the graph card header and keep import hidden by default.

Inspector/report cleanup:
- Inspector now shows graph overview when nothing is selected: nodes, edges, visible edge kinds, and click hint.
- Node/edge reason text is clamped to keep panel compact.
- Latest report is compact inside production graph side panel with scanId, issue count, and top 3 issues.
- Legacy mode still renders the old latest report side panel.

Known limitations:
- Visual sanity was checked through build/typecheck only; no browser screenshot captured in this phase.
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred to R5.8.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.8 — Object member call edges / dependency chain completion


## R5.7.2 — Dashboard route architecture and production-first UI cleanup

Status: completed.

Files changed:
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/components/production-graph-canvas.tsx`
- `apps/ui/src/lib/dashboard-navigation.ts`
- `apps/ui/src/lib/dashboard-navigation.self-check.ts`
- `apps/ui/src/lib/use-dashboard-data.ts`
- `docs/plan/production-refactor-progress.md`

Sidebar/page architecture:
- Dashboard now uses state-based page navigation with pages: Endpoint, Graph, Reports, Scans, Settings.
- Sidebar and mobile sidebar switch the active page and show clear active state.
- Lucide icons are used for sidebar items, headings, scan action, worker/network, settings, and security placeholders.
- `dashboard-navigation.ts` owns nav item definitions and default page.

Production-first behavior:
- Default dashboard page is Graph.
- Default graph mode is production.
- Graph page shows production summary cards and React Flow production canvas by default.
- Production canvas desktop min height is now `40.625rem`.
- Endpoint page no longer renders graph canvas.
- Reports page no longer shares space with graph canvas.
- Scans page owns run-scan state and scan shortcut.
- Settings page is read-only placeholder for project, worker, appearance, and security.

Legacy hidden/deprecation plan:
- Main topbar no longer shows the legacy/production toggle.
- Legacy graph UI is hidden unless `NEXT_PUBLIC_LUTEST_SHOW_LEGACY_GRAPH=true`.
- Legacy `/api/graph` API client method remains for debug compatibility.
- `useDashboardData` prevents legacy graph loading when debug legacy UI is not enabled.
- Legacy backend endpoint is not deleted in this phase.
- Deprecation plan: keep legacy graph as debug-only until production graph covers R5.8+ call chain gaps and later UI migration is complete.

Components extracted:
- Navigation config extracted to `apps/ui/src/lib/dashboard-navigation.ts`.
- Dashboard shell internally split into page components, metric/status primitives, sidebars, and topbar.

Known limitations:
- Data loading is still centralized through `useDashboardData`; page-specific fetch splitting is deferred.
- No browser screenshot captured in this phase.
- Settings controls are read-only placeholders because worker config APIs do not exist yet.
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred to R5.8.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.8 — Object member call edges / dependency chain completion


## R5.7.3 — Sticky top header and app chrome cleanup

Status: completed.

Files changed:
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/lib/dashboard-navigation.ts`
- `docs/plan/production-refactor-progress.md`

Fixed topbar behavior:
- Topbar is now fixed at the viewport top with `left: 0` on mobile and `md:left-[18rem]` on desktop.
- Topbar uses `h-20`, white translucent background, bottom border, and backdrop blur.
- Main content starts below the fixed header with `pt-24` so content is not covered.
- Sidebar remains fixed at the left.

Page title mapping:
- Topbar left side now shows active section icon, title, and subtitle from dashboard navigation config.
- Endpoint: API endpoint configuration.
- Graph: Production symbol graph.
- Reports: Scan issues and latest report.
- Scans: Run checks and future browser scans.
- Settings: Manage preferences.

Removed/compacted hero:
- Removed the giant repeated hero title from the app chrome.
- Topbar now uses compact 9Router-style page header instead of page-wide hero copy.
- Mobile topbar owns the menu button because sidebar is hidden on mobile.

Layout before/after:
- Before: top area consumed large vertical space and scrolled away with content.
- After: app chrome stays fixed, actions stay reachable, and page content scrolls underneath with more usable graph space.
- Right-side actions are compact: Donate, theme, language, app grid, Run scan.

Known limitations:
- Visual acceptance was not browser-screenshot verified in this phase.
- Language/theme/donate/app grid remain UI placeholders.
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred to R5.8.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.8 — Object member call edges / dependency chain completion


## R5.7.4 — Graph page viewport polish and metric clarity

Status: completed.

Files changed:
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/components/production-graph-canvas.tsx`
- `docs/plan/production-refactor-progress.md`

Metric card cleanup:
- Graph metric cards now use smaller padding and typography.
- `Graph health` now shows `60 edges` style value with `3 issues` metadata instead of ambiguous `60 / 3`.
- UI symbols and API flow cards keep clear sub-metrics for pages/components/hooks and clients/endpoints.

Canvas viewport improvement:
- Production canvas card padding reduced.
- Canvas header compacted to `Production canvas` plus `nodes · edges` line.
- React Flow area now uses `min-height: 43.75rem` on desktop target area.
- Inspector stays fixed-width at `20rem`, leaving canvas as dominant area.
- Graph page no longer passes latest report into canvas; full report remains in Reports page.

Graph page title cleanup:
- Removed repeated Graph page `PageTitle` below sticky topbar.
- Topbar remains source of active page title/subtitle.
- Graph content now starts with compact metrics and canvas workspace.

Known limitations:
- Visual acceptance was not browser-screenshot verified in this phase.
- Object member call edges from `useDashboardData` to `lutestApi.*` remain deferred to R5.8.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R5.8 — Object member call edges / dependency chain completion


## R5.8 — Object member call edges / dependency chain completion

Status: completed.

Files changed:
- `apps/worker-node/src/modules/graph/production/production-edge-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.self-check.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `apps/ui/.lutest/audits/production-graph-accuracy-apps-ui.json`
- `docs/plan/production-refactor-progress.md`

Object member call patterns supported:
- Same-file exact object member calls: `api.getUsers()` resolves only when `api.getUsers` classified symbol exists in the same file.
- Named imported object calls: `import { api } from "./api"; api.getUsers()` resolves to `api.getUsers` in imported file.
- Named import alias calls: `import { api as client } from "./api"; client.getUsers()` resolves to `api.getUsers` in imported file.
- Local helper expansion: classified source calling a same-file helper can inherit exact object member calls inside that helper, used for `useDashboardData -> loadGraph -> lutestApi.getGraph/getProductionGraph`.

Import binding resolution behavior:
- Namespace imports keep existing behavior.
- Named object imports now match `localName.property` to imported target symbol `${importedName}.property`.
- Ambiguous/missing bindings do not create call edges.
- Dynamic element access like `api[methodName]()` does not create edges.

apps/ui before:
- Total edges: 60 from prior R5.7.4 baseline.
- Object member call edges: 4 from pre-fix audit during R5.8.
- Missing: `useDashboardData->lutestApi.getGraph`, `useDashboardData->lutestApi.getProductionGraph`.

apps/ui after:
- Total edges: 68.
- Call edges: 12.
- Object member call edges: 6.
- Added/confirmed:
  - `useDashboardData->lutestApi.getStatus`
  - `useDashboardData->lutestApi.getProject`
  - `useDashboardData->lutestApi.getGraph`
  - `useDashboardData->lutestApi.getProductionGraph`
  - `useDashboardData->lutestApi.getLatestReport`
  - `useDashboardData->lutestApi.runScan`
- Audit verdict: `PASS`.

False-positive guards:
- `console.log()` ignored.
- `response.json()` has no edge unless exact target symbol exists and binding is clear.
- Dynamic `api[methodName]()` ignored.
- `unknownApi.getUsers()` ignored because no import/same-file binding resolves.
- Repeated calls dedupe by `kind + source + target` edge id.

Known limitations:
- Helper expansion is one-level and same-file only.
- No external library call edges are created.
- Object member call resolution remains intentionally conservative.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/import-resolver/import-resolver.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/source-extractors/ts-js/api-client-object-method.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS` and explicit object member call edge confirmation.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R6.0 — Playwright scan engine foundation

## R6.0 — Playwright scan engine foundation

Status: completed.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-route-discovery.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Route discovery strategy:
- Runtime scan accepts explicit `routes` first.
- If routes are omitted, it builds the production graph for `projectRoot` and reads page nodes with `route.path`.
- Routes are normalized, deduped, and sorted.
- If no production routes exist, it falls back to `["/"]` and records fallback reason.

Browser scan behavior:
- Uses Playwright Chromium with configurable `headless`, `viewport`, and `timeoutMs`.
- Opens each route at `baseUrl + route`.
- Captures console warnings/errors, page errors, request failures, responses with status `>= 400`, route status, duration, and screenshot.
- Browser context/page/browser close in `finally` paths.
- Runtime code does not install browsers automatically; use `npx playwright install chromium` if Chromium is missing.

Captured artifacts:
- Screenshots are written under `<projectRoot>/.lutest/runtime-scans/<scanId>/screenshots/<safe-route>.png`.
- Runtime scan JSON is written to `<projectRoot>/.lutest/runtime-scans/<scanId>/runtime-scan.json`.
- Artifact paths are checked to stay inside the selected project root.

Self-check behavior:
- Starts a local HTTP server, no internet dependency.
- Serves `/` with `console.warn`, `console.error`, and a missing `/missing.js` request.
- Runs a Playwright scan against the local server.
- Asserts route result, screenshot artifact, JSON artifact, console capture, failed response capture, and summary counts.

Known limitations:
- No `/api/actions/scan` integration in R6.0; runtime scan is internal service + self-check only.
- Latest report schema does not include runtime scan yet.
- DOM Geometry is later: R6.4 — DOM Geometry Foundation.
- Auth/password/settings behavior unchanged.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed with `PASS`.
- npm/npx PowerShell shim still prints `Test-Path : Access is denied`, but commands exited `0`.

Next phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape


## R6.0.1 — Runtime scan safety and result correctness

Status: completed.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-route-discovery.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `docs/plan/production-refactor-progress.md`

Path policy bypass fixed:
- Removed unsafe `allowedRoot: request.projectRoot` behavior.
- Runtime scan now calls configured path policy with `pathPolicyService.assertProjectRoot(request.projectRoot)`.
- Outside project roots are rejected by configured allowed root.

BaseUrl local-only policy:
- Runtime scan accepts only `http:`/`https:` local URLs.
- Allowed hostnames: `localhost`, `127.0.0.1`, `::1`.
- Rejects external hosts, credentials, `file:`, `data:`, `javascript:`, and other non-HTTP(S) protocols.
- Invalid baseUrl throws `Runtime scan baseUrl must be a local HTTP(S) URL`.

Screenshot/result correctness:
- `screenshotPath` is now optional and set only after `page.screenshot()` succeeds.
- `screenshotError` records screenshot failure messages.
- `summary.screenshotCount` counts only routes with a real `screenshotPath`.

Route error capture:
- Navigation/load errors are stored in route-level `error`.
- One failed route no longer discards the whole scan result.
- Browser context/page/browser still close in `finally` paths.

Filename collision fix:
- Screenshot filenames now include route index and short hash.
- Routes like `/foo/bar` and `/foo-bar` produce distinct screenshot paths.

Route discovery type fix:
- `RuntimeScanResult.routeDiscovery` now includes `routes`.
- Runtime result JSON persists `routeDiscovery.routes`.

Route normalization safety:
- Empty route normalizes to `/`.
- Missing leading slash is added.
- Absolute URL-like routes such as `https://evil.com` are rejected as local path violations.

Self-check coverage:
- Allowed root project scan passes.
- Outside project root is rejected.
- Local baseUrl passes.
- `https://example.com`, `file:///etc/passwd`, and credentialed local URL are rejected.
- Unreachable route returns route result with `error` and no screenshot count.
- Screenshot collision routes produce distinct paths.
- `routeDiscovery.routes` is present in artifact JSON.

What was not changed:
- No `/api/actions/scan` integration.
- `ScanResponse` unchanged.
- `LatestReportResponse` unchanged.
- No DOM Geometry, overlap, or contrast checks.
- Production graph endpoints and builder unchanged.
- UI unchanged.

Known limitations:
- Runtime scan remains internal service + self-check only.
- Browser installation remains operator-managed with `npx playwright install chromium` if needed.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed.
- PowerShell `npx.ps1` still prints `Test-Path : Access is denied`, but `npx` self-check commands exited successfully.

Next phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

## AICTX-1 — Repo-local AI handoff context package

Status: completed.

Why this was added:
- Long phase history now has a repo-local AI handoff entrypoint instead of relying on chat history.
- Future AI sessions can read curated project state, decisions, known issues, and next tasks from versioned files.
- Context intentionally stores durable facts only, not full chat logs or secrets.

Files created:
- `AI_HANDOFF.md`
- `docs/ai-context/00-read-me-first.md`
- `docs/ai-context/01-project-overview.md`
- `docs/ai-context/02-architecture.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/04-decisions.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/ai-context/prompts/start-session-read.md`
- `docs/ai-context/prompts/end-session-update.md`

How future AI sessions should use it:
- Start with `AI_HANDOFF.md`.
- Read `docs/ai-context/00-read-me-first.md` through `07-session-handoff.md`.
- Check `git status` and `git diff --stat` before editing.
- Use `docs/plan/production-refactor-progress.md` for detailed phase history.
- If context conflicts with code, prefer code and report/update the context.

Update workflow:
- At session end, update current state, decisions, known issues, next tasks, and session handoff only when durable facts changed.
- Record tests actually run; do not mark unrun checks as passed.
- Do not copy chat history.
- Do not store secrets, tokens, cookies, passwords, or private credentials.

Known limitations:
- Context can become stale and must be verified against code/progress docs each session.
- Attached AICTX-1 prompt referenced R5.8 as latest, but repo progress shows R6.0.1 is latest completed phase; context records R6.0.1.
- Working tree already had uncommitted R6.0.1 runtime scan changes before AICTX-1.
- No markdown lint script was found in root package scripts.

Tests/checks run:
- `git status` — run.
- `git diff --stat` — run.
- Markdown lint — not available in repo scripts.

Next phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

## R5.8.1 — Production graph persistence and selected-root parity

Status: completed.

Audit before:
- Legacy graph artifact path: `<projectRoot>/.lutest/graph/latest-graph.json`, from `pathService.resolveProjectPaths(...).latestGraphPath` and `graphRepository.saveLatest()`.
- Production graph artifact before this phase: none found in production graph endpoint; `getProductionGraph` built, validated, and returned only the response.
- `getValidatedProjectPath(req, res, validateGraphQuery)` behavior: explicit `?path=` / `?projectPath=` is validated by path policy and returns real selected root; no explicit query path returns configured allowed root from `LUTEST_PROJECT_PATH` / `PROJECT_PATH` / `process.cwd()`.
- `/api/graph/production` with no query path and `LUTEST_PROJECT_PATH` set already received selected env root from the helper, but it did not persist a production graph artifact.

Files changed:
- `apps/worker-node/src/modules/graph/graph.controller.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-artifacts.ts`
- `apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts`
- `docs/plan/production-refactor-progress.md`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/07-session-handoff.md`

What changed:
- Production graph endpoint now resolves project paths through `pathService.resolveProjectPaths`, matching legacy/project selected-root behavior.
- Production graph endpoint builds from `paths.targetProjectRoot`.
- Production graph response is still validated with `validateProductionGraphResponse` before return.
- Production graph endpoint now writes latest production graph artifacts under the validated selected project root.
- Artifact write is fatal if it fails, because persistence is expected behavior for this phase.
- HTTP response body remains raw `ProductionGraphResponse` and is unchanged.

Artifact behavior:
- Raw graph: `<projectRoot>/.lutest/graph/latest-production-graph.json`
- Metadata: `<projectRoot>/.lutest/graph/latest-production-graph.meta.json`
- Raw graph artifact is the exact `ProductionGraphResponse` and validates with `validateProductionGraphResponse`.
- Metadata contains `generatedAt`, `rootDir`, `mode`, and `graphPath`.

Self-check coverage added:
- `/api/graph/production` no-query request writes `latest-production-graph.json` under selected `LUTEST_PROJECT_PATH` root.
- Latest production graph artifact validates with `validateProductionGraphResponse`.
- Artifact content matches the HTTP response body.
- Metadata file exists.
- Existing outside-root rejection and legacy `/api/graph` checks remain covered.

What was not changed:
- No `ProductionGraphResponse` shape change.
- No `/api/graph/production` response body change.
- No `/api/graph` legacy behavior change.
- No legacy graph removal.
- No DOM Geometry.
- No `/api/actions/scan` change.
- No `ScanRequest` / `ScanResponse` change.
- No path-policy loosening.
- No generated `.lutest` artifacts committed.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed.
- PowerShell `npm.ps1` / `npx.ps1` still printed `Test-Path : Access is denied`, but all commands above exited `0`.

Known limitations:
- Only latest production graph is persisted; timestamped production graph snapshots are not added in this phase.
- Production graph remains symbol-level static analysis; runtime correlation is for later phases.

Next recommended phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

## R5.9 — MVP legacy cleanup and production cutover

Status: completed.

Legacy audit:
- Frontend active production path: `useDashboardData` loads `lutestApi.getProductionGraph`, `lutestApi.getLatestReport`, status/project, and scan action.
- Frontend legacy UI before cleanup: `GraphMode`, `SHOW_LEGACY_GRAPH`, graph toggle, `LegacyGraphPanel`, and `LegacyColumn` in `dashboard-shell.tsx` / `use-dashboard-data.ts`.
- Backend compatibility endpoint: `GET /api/graph` remains mounted and returns legacy file-level `GraphResponse` through `graphService.buildAndSaveGraph`.
- Contract legacy usage: `GraphResponse`, `GraphNode`, `GraphEdge`, and `GraphSummary` remain because `/api/graph` and `lutestApi.getGraph()` remain compatibility/debug surfaces.
- Test/self-check dependency: production graph HTTP self-check still asserts legacy `/api/graph` exists and is not symbol-level; dashboard API request self-check still verifies `lutestApi.getGraph()` path/error behavior.
- Safe deletions: frontend legacy graph toggle/panel/state and normal `/api/graph` fetch path.
- Kept for now: backend `graph.service.ts`, `/api/graph`, `GraphResponse` contract, and `lutestApi.getGraph()` for compatibility/debug.

Files changed:
- `apps/ui/src/lib/use-dashboard-data.ts`
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/lib/dashboard-navigation.self-check.ts`
- `apps/worker-node/src/modules/graph/graph.routes.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `packages/contracts/src/validators.self-check.ts`
- `docs/plan/production-refactor-progress.md`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/04-decisions.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`

What was removed:
- Normal UI graph mode state and production/legacy toggle.
- Legacy graph panel and columns from `dashboard-shell.tsx`.
- Default app data flow call to `lutestApi.getGraph()`.
- `GraphMode`, `DEFAULT_GRAPH_MODE`, and `SHOW_LEGACY_GRAPH` from `use-dashboard-data.ts`.

What was deprecated/kept:
- Backend `/api/graph` remains as deprecated compatibility/debug endpoint.
- `graph.service.ts` remains legacy file-level graph implementation for that endpoint.
- `GraphResponse` contract remains because the compatibility endpoint still returns it.
- `lutestApi.getGraph()` remains as compatibility/debug API client helper, but normal dashboard flow no longer calls it.

Production path after cleanup:
- Dashboard default graph data source is only `/api/graph/production`.
- `useDashboardData` fetches status, project, production graph, latest report, and scan action.
- Production graph response shape remains unchanged.

What was not changed:
- No DOM Geometry.
- No Playwright runtime scan changes.
- No `/api/actions/scan` changes.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` changes.
- No path-policy changes.
- No report/project summary removal.
- No legacy backend endpoint removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed.
- PowerShell `npm.ps1` / `npx.ps1` still printed `Test-Path : Access is denied`, but all commands above exited `0`.

Known limitations:
- Backend legacy graph remains for compatibility/debug and self-check coverage.
- Timestamped production graph snapshots are still not added.
- Runtime scan remains internal service/self-check.
- No DOM geometry/viewport matrix/layout detection yet.

Next recommended phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

## R6.0.2 — Runtime Browser Preflight

Status: completed.

Audit before:
- Browser launch errors previously escaped from `chromium.launch()` inside `runPlaywrightRuntimeScan` and rejected the service call.
- `runPlaywrightRuntimeScan` returned `RuntimeScanResult` on scan completion, but threw for invalid baseUrl, path-policy failure, route discovery validation, artifact path failure, and browser launch failure.
- Existing self-check expected config/path errors to reject, successful routes to produce screenshots, and unreachable route navigation to be captured in `routes[0].error` with no `screenshotPath`.
- Route-level errors were recorded per route via `error`, `screenshotError`, `consoleMessages`, `pageErrors`, `networkErrors`, and `failedResponses`.
- Config/baseUrl errors were modeled as thrown `Error("Runtime scan baseUrl must be a local HTTP(S) URL")` before artifacts/browser work.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added Playwright Chromium browser preflight before real runtime scan browser work.
- Missing browser is classified as `PLAYWRIGHT_BROWSER_MISSING` with remediation `npx playwright install chromium`.
- Generic launch failure is classified as `PLAYWRIGHT_BROWSER_LAUNCH_FAILED`.
- Preflight error messages are sanitized and do not include raw stack/path details.
- Runtime code does not install browsers and does not use a user-open dashboard browser.

What was not changed:
- No DOM Geometry.
- No runtime contracts/artifact shape change.
- No `/api/actions/scan` behavior change.
- No `ScanRequest` / `ScanResponse` change.
- No UI change.
- No path-policy loosening.
- No external baseUrl policy change.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run typecheck --workspaces --if-present` — passed.
- PowerShell `npm.ps1` / `npx.ps1` printed known `Test-Path : Access is denied` noise, commands exited `0`.

Known limitations:
- Runtime scan remains internal service/self-check.
- No DOM geometry/viewport matrix/layout detection yet.

Next recommended phase:
- R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

## R6.1 — Runtime Internal Contracts, Limits & Artifact Shape

Status: completed.

Audit before:
- Runtime result type lived in `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`.
- Route result fields were `route`, `url`, `status`, `screenshotPath`, `screenshotError`, `error`, console/page/network/failed response arrays, and `durationMs`.
- Screenshot output was stored as optional `screenshotPath` only after screenshot success; screenshot failures used `screenshotError`.
- Route errors were strings before R6.1; R6.1 standardizes them as `RuntimeScanError` objects internally.
- Runtime artifact write path already existed in Playwright service at `<projectRoot>/.lutest/runtime-scans/<scanId>/runtime-scan.json`.
- Playwright service was already writing JSON itself; R6.1 validates the internal schema and records migration plan to move writes into repository in R6.2.
- Limits before R6.1 were partial: default viewport constant and timeout from `request.timeoutMs ?? WORKER_TIMEOUT ?? 15000`; no max route/target/screenshot/element/text/ignored-tags contract.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-limits.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifact-contract.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added internal `runtime-scan.v1` schema/version and validator.
- Added internal route/state/flow target types, target result, viewport result, runtime error, artifact meta, DOM placeholder, and layout issue placeholder types.
- Added default runtime scan limits: `maxRoutes`, `maxTargets`, `maxElementsPerViewport`, `maxTextSnippetLength`, `maxScreenshots`, `routeTimeoutMs`, `scanTimeoutMs`, and `ignoredTags`.
- Runtime scan uses resolved limits for route timeout, max routes, max targets, and max screenshots.
- Added runtime artifact repository path/interface contract for R6.2 without full save/read implementation.
- Existing Playwright JSON write path now validates the internal artifact shape before writing.

What was not changed:
- No R6.2 repository save/read implementation.
- No DOM Geometry extraction.
- No Viewport Matrix.
- No State/Flow execution.
- No Layout Issue Engine.
- No `/api/actions/scan` change.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No legacy backend `/api/graph` removal.

Repository migration note:
- Current write path remains `<projectRoot>/.lutest/runtime-scans/<scanId>/runtime-scan.json` inside Playwright service for R6.1.
- R6.2 should move this write behind `RuntimeArtifactRepositoryContract`, implement save/read latest, and add metadata handling.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- PowerShell `npm.ps1` / `npx.ps1` printed known `Test-Path : Access is denied` noise, commands exited `0`.

Known limitations:
- Runtime artifact repository behavior is contract-only until R6.2.
- DOM geometry/viewport matrix/state-flow/layout issue detection remain future phases.

Next recommended phase:
- R6.2 — Runtime Artifact Repository Foundation

## R6.2 — Runtime Artifact Repository Foundation

Status: completed.

Audit before:
- Runtime artifact write path was inside `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`.
- Previous active path was `<projectRoot>/.lutest/runtime-scans/<scanId>/runtime-scan.json`.
- Previous Playwright service validated before direct JSON write.
- No read-latest support existed.
- No separate runtime metadata artifact existed.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifact-contract.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added `runtimeScanArtifactPaths(...)` with path-safe scanId validation and project-root containment checks.
- Added `saveLatestRuntimeScan(...)` to write latest artifact, metadata, and scan snapshot with stable JSON formatting.
- Added `readLatestRuntimeScan(...)` to return validated latest artifact, `null` when missing, and typed internal error when invalid.
- Added `saveRuntimeScanSnapshot(...)` helper for snapshot writes.
- Added metadata file with safe fields only: schemaVersion, scanId, generatedAt, selectedRoot, projectRoot, latestPath, snapshotPath, targetCount, errorCount.
- Migrated Playwright runtime scan service to repository helpers; service no longer directly writes runtime artifact JSON.

Canonical artifact paths:
- Latest: `<projectRoot>/.lutest/runtime/latest-runtime-scan.json`
- Metadata: `<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json`
- Snapshot: `<projectRoot>/.lutest/runtime/scans/<scanId>.json`

Path safety audit:
- `scanId` must match `^[a-zA-Z0-9._-]+$`; traversal strings such as `../escape` are rejected.
- Repository resolves project root and asserts every artifact path remains inside selected project root.
- Snapshot path is generated from safe scanId under `.lutest/runtime/scans/` only.
- Metadata does not include cookies, localStorage, auth state, raw fill values, tokens, passwords, or raw stack traces.

What was not changed:
- No R6.3 target model/discovery modes.
- No DOM Geometry extraction.
- No Viewport Matrix.
- No Manual State/Flow Execution.
- No Layout Issue Engine.
- No `/api/actions/scan` change.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.

Known limitations:
- Runtime repository is internal only; no public latest-runtime API yet.
- DOM geometry/viewport matrix/state-flow/layout issue detection remain future phases.

Next recommended phase:
- R6.3 — Runtime Target Model & Discovery Modes

## R6.3 — Runtime Target Model & Discovery Modes

Status: completed.

Audit before:
- Runtime scan input still receives optional `routes?: string[]` through internal `RuntimeScanRequest`; no public API contract was changed.
- Route discovery returns normalized sorted routes from request, production graph page nodes, or fallback `/`.
- Runtime result had `targets` and route results, but Playwright service built route targets inline from routes.
- R6.1 schema already had `RuntimeRouteTarget`, `RuntimeStateTarget`, `RuntimeFlowTarget`, `RuntimeScanTarget`, and `RuntimeTargetResult` placeholders.
- R6.2 artifact repository persisted the existing `targets`, `routes`, `routeDiscovery`, and summary shape through validated latest/snapshot writes.
- `maxRoutes` was applied before target creation; `maxTargets` was applied while building route targets.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added `RuntimeFlowStep` placeholder type and internal `RuntimeDiscoveryMode`.
- Added `runtime-scan-targets.ts` for route target creation, state/flow placeholders, target discovery resolution, and route-only execution assertion.
- Discovery modes are now explicit internally: `all-routes`, `selected-routes`, and reserved `custom-targets`.
- Playwright runtime scan uses target discovery instead of building route targets inline.
- Runtime artifacts now record `targetDiscovery` with mode, targetIds, and reason, plus `routeDiscovery.mode`.
- Schema validation now rejects invalid target kinds.

What was not changed:
- No R6.4 DOM Geometry.
- No Viewport Matrix.
- No Manual State/Flow Execution.
- No click/fill/waitForSelector/auto-click behavior.
- No Layout Issue Engine.
- No `/api/actions/scan` change.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.

Known limitations:
- State and flow targets are placeholders only.
- `custom-targets` mode is reserved internally; no public request/API path feeds custom targets yet.
- DOM geometry/viewport matrix/layout issue detection remain future phases.

Next recommended phase:
- R6.4 — DOM Geometry Foundation

## R6.4 — DOM Geometry Foundation

Status: completed.

Audit before:
- Internal schema had `DomGeometry` placeholder as `{ elements: DomElementGeometry[] }`.
- `RuntimeViewportResult` already had optional `domGeometry`, but Playwright service did not populate it.
- Runtime scan executed route targets from the R6.3 target model and attached results to `viewportResults`.
- Limits already included `maxElementsPerViewport`, `maxTextSnippetLength`, and `ignoredTags`, but they were not used for DOM capture.
- Artifact repository persisted validated runtime result shape from R6.2.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added Playwright DOM geometry capture helper.
- DOM geometry now includes viewport, capturedAt, elementCount, truncated, and elements.
- Element geometry includes internalId, tagName, selectorHint, id, className, role, ariaLabel, textSnippet, full rect, visibility metadata, clickable heuristic, and order.
- Playwright runtime scan captures DOM geometry after successful page load and attaches it to `viewportResults[].domGeometry`.
- DOM capture filters ignored tags, zero-area elements, hidden elements, and fully transparent elements.
- DOM capture enforces `maxElementsPerViewport` and `maxTextSnippetLength`.
- Runtime schema validation now checks viewportResults and domGeometry element arrays.

What was not changed:
- No R6.5 Viewport Matrix.
- No Manual State/Flow Execution.
- No click/fill/waitForSelector/auto-click behavior.
- No Layout Issue Engine.
- No `/api/actions/scan` change.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.

Known limitations:
- DOM geometry is captured for the current single viewport only.
- State and flow targets remain placeholders only.
- Layout issue detection remains a future phase.

Next recommended phase:
- R6.5 — Viewport Matrix

## R6.5 — Viewport Matrix

Status: completed.

Audit before:
- Playwright runtime scan used one viewport: `request.viewport ?? { width: 1440, height: 900 }`.
- Browser context was created once per scan with that single viewport.
- Each route result had a single `viewportResults[]` entry.
- Screenshot filenames did not include viewport because only one viewport existed.
- DOM geometry from R6.4 was captured for the single current viewport.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added default production viewport matrix:
  - mobile `390x844`
  - tablet `768x1024`
  - desktop `1440x900`
- Added runtime viewport resolver helper and self-check.
- Playwright runtime scan now runs each executable route target across all default viewports when no custom internal viewport is provided.
- Internal `request.viewport` remains a single custom viewport override for current self-check/internal callers; no public contract changed.
- Each route result now records one `viewportResults[]` entry per executed viewport.
- Each viewport result records per-viewport screenshot path, screenshot error, DOM geometry, and layoutIssues placeholder.
- Screenshot filenames include viewport slug to avoid collisions.
- Summary screenshot count now counts per-viewport screenshots.

What was not changed:
- No R6.6 Manual State/Flow Execution.
- No click/fill/waitForSelector/auto-click behavior.
- No Layout Issue Engine.
- No `/api/actions/scan` integration.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.

Known limitations:
- State and flow targets remain placeholders only.
- Layout issue detection remains a future phase.

Next recommended phase:
- R6.6 — Manual State/Flow Execution

## R6.6 — Manual State/Flow Execution

Status: completed.

Audit before:
- Runtime schema had state/flow target placeholders but no executable step model.
- Internal `RuntimeScanRequest` accepted routes only, not custom runtime targets.
- R6.5 Playwright runtime scan executed route targets across viewport matrix only.
- No click/fill/waitForSelector/waitForTimeout support existed in runtime scan.
- Public API contracts were not connected to runtime scan and remain unchanged.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added declared internal manual flow step model: `goto`, `click`, `fill`, `waitForSelector`, `waitForTimeout`, `screenshotMarker`.
- Added internal custom `targets?: RuntimeScanTarget[]` support on `RuntimeScanRequest`; no public contract changed.
- State and flow targets can now include route and declared steps.
- Added manual flow runner that executes only declared steps and stops on first failed step.
- Runtime target discovery supports internal `custom-targets` mode.
- Playwright runtime scan executes manual steps after route load and before screenshot/DOM capture for each viewport.
- Runtime target results can record `executionSteps` with step kind/status/message.

What was not changed:
- No R6.7 Layout Issue Engine.
- No Auth StorageState.
- No automatic crawling or exploratory clicking.
- No `/api/actions/scan` integration.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.

Known limitations:
- Manual execution is internal only; no public API/UI controls yet.
- Auth StorageState remains future work.
- Layout issue detection remains a future phase.

Next recommended phase:
- R6.7 — Runtime Layout Issue Engine

## R6.7 — Runtime Layout Issue Engine

Status: completed.

Audit before:
- `RuntimeLayoutIssue` existed as a minimal placeholder with code/message/severity only.
- `viewportResults[].layoutIssues` was always an empty array.
- DOM geometry, viewport matrix, and manual flow execution were already available internally.
- No detector module existed; Playwright service owned runtime scan orchestration.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added standalone runtime layout issue detector that consumes DOM geometry only.
- Added structured runtime issue shape: id, type, code, severity, message, scanTargetId, route, viewport, elementRef, and evidence.
- Implemented issue types: `horizontal-overflow`, `element-outside-viewport`, `small-click-target`, `suspicious-overlap`, `zero-size-visible-element`.
- Added severity mapping and explicit threshold/evidence strings.
- Playwright runtime scan now calls the detector after DOM geometry capture and attaches issues to `viewportResults[].layoutIssues`.
- Detector self-check uses fake DOM geometry input and does not depend on browser/Playwright.

What was not changed:
- No R7 public runtime contracts.
- No `/api/actions/scan` integration.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No contrast detection.
- No OCR.
- No AI analysis.
- No Auth StorageState.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.

Known limitations:
- Detector is heuristic-only and internal.
- Contrast/OCR/AI analysis are intentionally not implemented.
- Public API/UI integration remains future work.

Next recommended phase:
- R6.8 — Runtime Artifact Repository Hardening

## R6.8 — Runtime Artifact Repository Hardening

Status: completed.

Audit before:
- Latest runtime artifact path was `<projectRoot>/.lutest/runtime/latest-runtime-scan.json`.
- Metadata path was `<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json`.
- Snapshot path was `<projectRoot>/.lutest/runtime/scans/<scanId>.json`.
- Runtime result JSON writes were already concentrated in `runtime-scan-artifacts.ts`; Playwright service called `saveLatestRuntimeScan`.
- Screenshot files are still written by Playwright service under repository-provided screenshots directory inside selected project root.
- Metadata was separate but included more path/root fields than needed.

Files changed:
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-artifact-contract.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added/standardized repository API semantics: `getRuntimeArtifactPaths`, `saveLatestRuntimeScan`, `readLatestRuntimeScan`, `saveRuntimeScanSnapshot`, and `readRuntimeScanSnapshot`.
- Latest runtime JSON, metadata, and snapshot writes now use atomic temp-file writes followed by rename.
- Repository validates artifacts before write and after read.
- Missing latest/snapshot returns `null`; malformed JSON and schema-invalid JSON throw typed `RuntimeScanArtifactError` codes.
- Snapshot save/read uses canonical `<projectRoot>/.lutest/runtime/scans/<scanId>.json`.
- ScanId safety now rejects traversal, slashes, backslashes, absolute paths, Windows drive prefixes, null bytes, and `..`.
- Path safety checks ensure all artifact paths stay under `<projectRoot>/.lutest/runtime`.
- Metadata is separated from `RuntimeScanResult` and stores safe fields only: schemaVersion, artifactVersion, scanId, savedAt, generatedAt, targetCount, viewportCount, screenshotCount, issueCount, errorCount.

What was not changed:
- No R7 public runtime contracts.
- No `/api/actions/scan` integration.
- No `ScanRequest`, `ScanResponse`, or `LatestReportResponse` change.
- No public runtime API contracts exposed.
- No UI change.
- No Auth StorageState.
- No issue engine change.
- No path-policy/baseUrl policy change.
- No Playwright browser auto-install.
- No legacy backend `/api/graph` removal.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

Known limitations:
- Runtime artifacts remain internal until R7 public contracts.
- Public API/UI integration remains future work.

Next recommended phase:
- R7.1 — Public Runtime Contracts

## R7.1 — Public Runtime Contracts

Status: completed.

Audit before:
- Existing `ScanRequest` only exposed `projectPath`.
- Existing `ScanResponse` exposed scan metadata, project summary, source file count, issues, and report path.
- Existing `LatestReportResponse` exposed `missing` or `valid` report state only.
- Internal runtime shape already covered targets, viewport results, DOM geometry, manual flow execution, layout issues, safe metadata, and artifact repository validation.
- Public validators used manual strict validation helpers; R7.1 extended that pattern instead of adding loose pass-through schemas.

Files changed:
- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added public `RuntimeScanRequest`, `RuntimeScanResult`, `RuntimeScanTarget`, `RuntimeViewportResult`, `DomGeometry`, `DomElementGeometry`, `RuntimeLayoutIssue`, `RuntimeArtifactMeta`, and runtime error shape.
- Added optional `ScanRequest.runtimeScan`, `ScanResponse.runtimeScan`, `LatestReportResponse.runtimeScan`, and `LatestReportResponse.runtimeArtifactMeta`.
- `runtimeScan` is opt-in and requires `enabled: true`.
- Runtime `baseUrl` is local-only HTTP(S): `localhost`, `127.0.0.1`, or `::1`.
- External, credential, `file:`, `data:`, and `javascript:` URLs are rejected.
- Runtime targets allow route/state/flow shapes; public validation rejects unknown target kinds and unknown step kinds.
- Flow validation enforces fill value source, destructive click opt-in, and bounded `waitForTimeout`.
- Public layout issue `code`, if present, must equal canonical `type`.
- Runtime artifact metadata remains separate and safe; raw runtime result/DOM geometry are not accepted in metadata.

What was not changed:
- No R7.2 scan service execution integration.
- No Playwright call from `/api/actions/scan`.
- No latest report runtime artifact read integration.
- No UI work.
- No Auth StorageState.
- No path-policy/baseUrl loosening.
- No generated `.lutest` artifacts committed.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

Known limitations:
- `/api/actions/scan` does not execute runtime scan yet.
- Latest report does not include runtime artifact data yet.
- Public runtime contracts are available, but UI has no runtime toggle.
- Auth StorageState remains deferred to R7.4.

Next recommended phase:
- R7.2 — Scan Service Integration

## R7.2 — Scan Service Integration

Status: completed.

Audit before:
- Scan endpoint/controller lives in `apps/worker-node/src/modules/scan/scan.controller.ts`; `/api/actions/scan` is registered in `apps/worker-node/src/app.ts`.
- Request validation already called `validateScanRequest(req.body)` in the controller.
- Selected project root was resolved through `pathPolicyService.assertProjectRoot` in the controller and `pathService.resolveProjectPaths` in services.
- Static scan flow lived in `scan.service.ts`: resolve paths, discover project, build/save graph, run rules, build `ScanResponse`, save report.
- Latest report save happened in `scan.repository.ts`; latest report read happened in `report.repository.ts` and `report.service.ts`.
- Runtime scan entrypoint was `runPlaywrightRuntimeScan` in `playwright-scan.service.ts`.
- Runtime artifact repository was called by the runtime service through `saveLatestRuntimeScan`; scan service had no runtime integration yet.
- Browser preflight was inside `playwright-scan.service.ts` via `assertPlaywrightBrowserPreflight`.

Files changed:
- `packages/contracts/src/index.ts`
- `packages/contracts/dist/index.d.ts`
- `packages/contracts/dist/index.js`
- `apps/worker-node/src/modules/scan/scan.controller.ts`
- `apps/worker-node/src/modules/scan/scan.service.ts`
- `apps/worker-node/src/modules/scan/scan.mapper.ts`
- `apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- `ScanRequest.runtimeScan` now triggers runtime scan execution only when `enabled: true` is present.
- Static-only scans remain unchanged and do not call runtime scan/browser preflight.
- Runtime config validation maps to `CONFIG_ERROR`; invalid local-only base URLs map to `BASE_URL_NOT_LOCAL` before scan work.
- Public runtime requests map to internal runtime requests through `runtime-public-contract-adapter.ts`.
- Runtime scan uses selected project root from static scan discovery and path-policy flow.
- Runtime result maps back to public `RuntimeScanResult`, validates with public validator, and attaches as `ScanResponse.runtimeScan`.
- Runtime artifacts remain persisted by runtime repository helpers; scan service does not directly write runtime JSON.
- Latest report save/read preserves runtime result inside `report.runtimeScan`.
- Missing Chromium maps to `PLAYWRIGHT_BROWSER_MISSING` with remediation and no raw stack.
- Per-target route execution failures map to public `ROUTE_SCAN_ERROR` inside target errors and do not fail the whole scan response.
- Contracts include R7.2 runtime/API error codes: `CONFIG_ERROR`, `BASE_URL_NOT_LOCAL`, `ROUTE_DISCOVERY_ERROR`, `TARGET_EXECUTION_ERROR`, `ROUTE_SCAN_ERROR`, `ARTIFACT_WRITE_ERROR`, and `RUNTIME_SCAN_FAILED`.

What was not changed:
- No UI runtime toggle.
- No Auth StorageState.
- No crawler/auto-click.
- No local-only baseUrl loosening.
- No path-policy loosening.
- No direct runtime artifact writes outside repository.
- No R8 dashboard/report visualization.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.

Known limitations:
- Latest report runtime integration is minimal and currently preserves runtime data inside `report.runtimeScan`; R7.3 should polish top-level latest report runtime/meta behavior.
- UI has no runtime toggle.
- Auth StorageState remains deferred.

Next recommended phase:
- R7.3 — Latest Report Integration

### R7.2 final adapter/integration remediation

Status: completed.

What changed:
- Runtime public/internal adapter now maps per-viewport console/page/network/failed-response data from viewport results instead of copying route-level buffers into every viewport.
- Internal runtime viewport results now preserve per-viewport event arrays and viewport error data.
- Public runtime target status and runtime summary error counts aggregate target errors, viewport errors, and failed execution steps without stale duplication.
- Public request mapping preserves `discoveryMode` and `viewportPreset` semantics and does not mutate the original request.
- Public runtime result target steps no longer echo fill `value`; fill result steps use `redacted`, `valueSource`, and safe `valueFromEnv` only.
- Adapter validation failures now throw `RuntimePublicContractAdapterError` and scan service maps them through the R7.2 error model.
- Integration self-check now asserts static-only scans do not create runtime artifacts.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

## R7.3 — Latest Report Integration

Status: completed.

Audit before:
- Latest report endpoint: `GET /api/report/latest` in `report.controller.ts`.
- Latest report repository read path: `<projectRoot>/.lutest/latest-report.json` through `report.repository.ts`.
- Latest report save path: `scan.repository.ts` writes scan report and latest report JSON.
- Current `LatestReportResponse` returned full `ScanResponse` only, with optional runtime fields from R7.1/R7.2.
- R7.2 saved runtime results inside `ScanResponse.runtimeScan`.
- Production graph artifact path source: `production-graph-artifacts.ts`, `<projectRoot>/.lutest/graph/latest-production-graph.json`.
- Stored scan/project data included absolute internal paths; public latest response needed sanitization.

Files changed:
- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `packages/contracts/dist/index.d.ts`
- `packages/contracts/dist/index.js`
- `apps/worker-node/src/modules/report/latest-report.mapper.ts`
- `apps/worker-node/src/modules/report/latest-report.mapper.self-check.ts`
- `apps/worker-node/src/modules/report/latest-report-integration.self-check.ts`
- `apps/worker-node/src/modules/report/report.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added latest report public summary/ref contract fields while preserving `state/report` compatibility.
- Added safe `ArtifactRef` contract and strict validator.
- Added latest report mapper so controller/service does not build paths or traverse runtime results inline.
- Latest response includes `generatedAt`, static summary, runtime summary, runtime issue summary, artifact refs, optional production graph ref, and safe selected-root metadata.
- Latest response strips heavy `report.runtimeScan` to `null` and exposes dashboard counts in `runtimeScanSummary`.
- Static-only latest report remains valid and has `runtimeScanSummary: null`.
- Runtime latest report read-back validates from disk/repository and includes runtime issue totals by severity and type.
- Public latest response sanitizes stored absolute paths to safe relative refs such as `.lutest/reports/...` and `.lutest/runtime/...`.

What was not changed:
- No R7.4 Auth StorageState.
- No UI dashboard work.
- No runtime/static scan rerun on latest report read.
- No local-only baseUrl or path-policy loosening.
- No artifact visualization endpoint.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report.mapper.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-targets.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-viewports.self-check.ts` — passed.

Known limitations:
- UI dashboard does not render latest runtime summary yet.
- Full artifact load/resolve endpoint remains future work.
- Auth StorageState remains future work.

Next recommended phase:
- R7.4 — Auth StorageState Integration

## R7.4 — Auth StorageState Integration

Status: completed.

Audit before:
- Existing auth support: none.
- Runtime context creation was in `playwright-scan.service.ts` via `browser.newContext(...)`.
- Existing endpoints were registered in `app.ts`; scan lived under `/api/actions/scan`.
- Runtime baseUrl validation was local-only in public contracts and runtime service.
- Selected project root resolution used path-policy in controllers/services.

Files changed:
- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `packages/contracts/dist/index.d.ts`
- `packages/contracts/dist/index.js`
- `apps/worker-node/src/app.ts`
- `apps/worker-node/src/modules/auth/auth-state.repository.ts`
- `apps/worker-node/src/modules/auth/auth-state.repository.self-check.ts`
- `apps/worker-node/src/modules/auth/auth-session.service.ts`
- `apps/worker-node/src/modules/auth/auth.controller.ts`
- `apps/worker-node/src/modules/auth/auth.routes.ts`
- `apps/worker-node/src/modules/auth/auth.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.ts`
- `apps/worker-node/src/modules/scan/scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

What changed:
- Added public auth contracts and strict validators.
- Added auth repository with selected-root path safety and atomic JSON/meta writes.
- Added auth endpoints for start, clear, and status.
- Added manual auth session service with Playwright-controlled browser/context and safe timeout/error mapping.
- Added runtime scan auth opt-in via `runtimeScan.auth.useSavedState`.
- Runtime scan without auth remains unchanged.
- Runtime scan with saved auth passes storageState path internally only.
- API/report/runtime responses do not expose raw storageState, cookies, tokens, passwords, or storage values.

What was not changed:
- No R8 UI dashboard.
- No cloud auth.
- No password manager.
- No automatic username/password fill.
- No path-policy or local-only baseUrl loosening.
- No generated auth artifacts committed.

Tests/checks run:
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth-state.repository.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report.mapper.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

Known limitations:
- Auth start requires real user interaction in a Playwright-controlled browser outside mocked tests.
- No UI for auth workflows yet.

Next recommended phase:
- R8.3 — Runtime UI polish / next roadmap phase

## R8.2 — Runtime Report UI

Status: completed.

Implemented:
- Report page renders runtime audit data from latest report only; no runtime scan trigger and no full artifact fetch.
- Added runtime report view-model helper with summary-only/full-result handling, issue extraction, severity counts, safe screenshot ref filtering, and target/route/viewport/severity filters.
- Added runtime report panel with targets/routes scanned, viewports scanned, filtered issue list, issue detail panel, empty/error/summary-only states.
- Security display avoids raw stack, storageState, cookies, tokens, passwords, raw fill/env values, and unsafe absolute screenshot paths.

Tests run:
- `npm run typecheck --workspaces --if-present`
- `npm run build -w ui`
- `npm run build -w @lutest/contracts`
- `npm run build -w @lutest/worker-node`
- `npx tsx ./apps/ui/src/lib/runtime-report-view-model.self-check.ts`
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts`
- `npx tsx ./apps/ui/src/lib/dashboard-data-request.self-check.ts`
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts`

Known limitations:
- R8.2 does not implement screenshot gallery, visual overlay, auth UI, artifact detail endpoint loading, or issue auto-fix.

Next recommended phase:
- R8.3 — Runtime UI polish / next roadmap phase
