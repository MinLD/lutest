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
