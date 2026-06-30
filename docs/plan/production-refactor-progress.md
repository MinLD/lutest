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

