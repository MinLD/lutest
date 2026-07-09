# Current State

## Latest Completed Phase

R8.2 — Runtime Report UI.

## Current Status

- Production graph is primary graph path.
- UI production graph integration exists and graph canvas is interactive.
- Default UI graph data flow calls `/api/graph/production`, not legacy `/api/graph`.
- Legacy graph toggle/panel was removed from normal UI.
- Backend `/api/graph` remains as deprecated compatibility/debug endpoint.
- Production graph endpoint uses selected/validated root resolution and persists latest production graph artifact.
- Production graph latest artifact path is `<projectRoot>/.lutest/graph/latest-production-graph.json`.
- Production graph latest metadata path is `<projectRoot>/.lutest/graph/latest-production-graph.meta.json`.
- Runtime scan foundation exists as internal service/self-check.
- Runtime scan runs Playwright Chromium preflight before real browser scan work.
- Runtime scan internal result shape is versioned as `runtime-scan.v1` and validated before write and after read.
- Runtime scan latest artifact path is `<projectRoot>/.lutest/runtime/latest-runtime-scan.json`.
- Runtime scan latest metadata path is `<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json`.
- Runtime scan snapshot path is `<projectRoot>/.lutest/runtime/scans/<scanId>.json`.
- Public contracts expose opt-in `RuntimeScanRequest` through optional `ScanRequest.runtimeScan`.
- Public `RuntimeScanRequest.baseUrl` validates local HTTP(S) only: `localhost`, `127.0.0.1`, or `::1`; external, credential, `file:`, `data:`, and `javascript:` URLs are rejected.
- Public contracts expose runtime result, target, viewport, DOM geometry, layout issue, artifact metadata, and runtime error shapes.
- `ScanResponse.runtimeScan`, `LatestReportResponse.runtimeScan`, and `LatestReportResponse.runtimeArtifactMeta` are optional; old scan/latest behavior remains valid when absent.
- `POST /api/actions/scan` keeps static-only behavior when `runtimeScan` is absent and does not call Playwright/browser preflight.
- `POST /api/actions/scan` runs runtime scan when `runtimeScan.enabled` is true, maps public runtime request to internal runtime service input, persists runtime artifacts through the repository, and attaches validated public `ScanResponse.runtimeScan`.
- Latest report storage now preserves `report.runtimeScan`; read-back can return the runtime result inside the report payload.
- Latest report response is now dashboard source-of-truth after refresh: it includes `generatedAt`, static scan summary, runtime scan summary, runtime issue summary, safe artifact refs, optional production graph ref, and sanitized selected-root metadata.
- Latest report response maps stored heavy `report.runtimeScan` to top-level summary/meta and returns `report.runtimeScan: null` to avoid duplicating full runtime artifacts in the dashboard payload.
- Auth storageState repository persists manual auth state under `<projectRoot>/.lutest/auth/storage-state.json` plus safe metadata under `storage-state.meta.json`.
- Auth endpoints exist: `POST /api/actions/auth/start`, `POST /api/actions/auth/clear`, and `GET /api/auth/status`.
- Runtime scans can opt in to saved auth state with `runtimeScan.auth.useSavedState`; auth is not used automatically.
- Public auth responses never include raw cookies, localStorage/sessionStorage, tokens, passwords, or raw storageState.
- Playwright runtime scan writes artifacts through `runtime-scan-artifacts.ts`, not direct service JSON writes.
- Runtime scan target model includes route targets plus state/flow placeholders.
- Runtime scan records discovery mode as `all-routes`, `selected-routes`, or internal `custom-targets`.
- R6.3 still executes route targets only; state/flow execution is not implemented.
- Runtime scan captures DOM geometry per executable route target viewport result.
- DOM geometry includes selector hints, attributes, clipped text, bounding rect, visibility metadata, clickable heuristic, order, and truncation metadata.
- DOM capture enforces `maxElementsPerViewport`, `maxTextSnippetLength`, and ignored tags.
- Runtime scan default viewport matrix is mobile `390x844`, tablet `768x1024`, desktop `1440x900`.
- Runtime scan attaches one `viewportResults[]` entry per viewport, with per-viewport screenshot and DOM geometry.
- Internal `request.viewport` still acts as a custom single-viewport override for self-check/internal callers.
- Runtime scan supports declared internal custom targets for route/state/flow execution.
- Manual flow steps supported internally: `goto`, `click`, `fill`, `waitForSelector`, `waitForTimeout`, `screenshotMarker`.
- Scanner only executes explicitly declared steps; no crawler or auto-click discovery.
- Runtime layout issue detector runs from DOM geometry only, independent of Playwright browser APIs.
- Runtime issues currently cover horizontal overflow, outside viewport, small click target, suspicious overlap, and zero-size visible element.
- Contrast, OCR, and AI analysis are intentionally not implemented.
- Runtime artifact repository has atomic latest/meta/snapshot writes and typed read errors.
- Canonical runtime artifact paths remain `<projectRoot>/.lutest/runtime/latest-runtime-scan.json`, `<projectRoot>/.lutest/runtime/latest-runtime-scan.meta.json`, and `<projectRoot>/.lutest/runtime/scans/<scanId>.json`.
- Runtime metadata is separate from `RuntimeScanResult` and stores safe counts only.

## Production Graph Persistence Facts

- Legacy graph latest artifact remains `<projectRoot>/.lutest/graph/latest-graph.json`.
- Production graph latest artifact is raw `ProductionGraphResponse` and validates with `validateProductionGraphResponse`.
- `/api/graph/production` response body is unchanged.
- Explicit `?path=` / `?projectPath=` still goes through path-policy.
- No-query production graph request uses configured selected root from `LUTEST_PROJECT_PATH` / `PROJECT_PATH` / allowed root fallback.

## Legacy Graph Facts

- Frontend normal flow no longer calls `lutestApi.getGraph()`.
- `lutestApi.getGraph()` remains for compatibility/debug.
- Backend `/api/graph` remains mounted and returns legacy file-level `GraphResponse`.
- `GraphResponse` contracts remain because the compatibility endpoint still uses them.

## Latest Verification Recorded

From current R7.4 session:

- R7.4 added public auth contracts/validators, auth repository, auth endpoints, mocked/manual auth session boundary, and runtime scan auth opt-in.
- Auth artifacts are selected-root scoped and use safe relative refs only.
- Missing/invalid auth state maps to `AUTH_STATE_MISSING` / `AUTH_STATE_INVALID`.
- R7.4 did not add UI, cloud auth, password manager, or automatic credential filling.

From current R7.3 session:

- R7.3 added public latest-report summary/artifact-ref contracts and strict validators.
- `GET /api/report/latest` reads from disk/repository, does not rerun static or runtime scan, and maps to a lightweight dashboard response.
- Artifact refs are relative/safe under selected project root; absolute roots are sanitized from public latest response.
- Runtime issue summary includes total, by severity, and by type.
- R7.3 did not add UI, Auth StorageState, or artifact visualization.

From current R7.2 session:

- R7.2 integrated opt-in runtime scan execution into scan service.
- Runtime config validation failures return `CONFIG_ERROR` or `BASE_URL_NOT_LOCAL` before static/runtime scan work starts.
- Missing Chromium maps to `PLAYWRIGHT_BROWSER_MISSING` with remediation and no raw stack.
- Per-target route failures map into public runtime target errors and do not fail the whole scan response.
- R7.2 did not add UI, Auth StorageState, crawler, or dashboard/report visualization.

From current R7.1 session:

- R7.1 added public runtime contracts and validators only.
- R7.1 did not execute runtime scan from `/api/actions/scan`.
- R7.1 did not integrate latest report runtime artifact reads.
- StorageState/auth remains deferred to R7.4.

From current R6.8 session:

- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- Dashboard navigation self-check — passed.
- Production graph adapter self-check — passed.
- Contracts validators self-check — passed.
- Production graph self-check — passed.
- Production graph HTTP self-check — passed.
- Path-policy HTTP self-check — passed.
- Runtime schema self-check — passed.
- Runtime browser preflight self-check — passed.
- Runtime scan self-check — passed.
- Runtime artifacts self-check — passed.
- Runtime targets self-check — passed.
- Runtime DOM geometry self-check — passed.
- Runtime viewport matrix self-check — passed.
- Runtime manual flow self-check — passed.
- Runtime layout issue detector self-check — passed.
- Runtime scan artifact repository read/write self-check — passed.
- Path-policy HTTP self-check — passed.
- Worker build — passed.
- Production graph accuracy audit for `D:/Projects/lutest/apps/ui` — passed.

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
