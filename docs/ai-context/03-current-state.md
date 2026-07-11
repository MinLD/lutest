# Current State

## Latest Completed Phase

R8.7 — Safe Interaction Discovery.

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

## R8.3 — Screenshot / Evidence Viewer

Status: completed.

Implemented:
- Runtime report view model now extracts deduplicated screenshot artifacts by target/route/viewport.
- Issue detail maps each runtime issue to evidence screenshot data using issue evidence screenshot first, then viewport screenshot fallback.
- UI shows a Screenshots / evidence section with captured/missing state, issue counts, safe refs only, and no clickable raw filesystem links.
- Issue detail panel now distinguishes missing screenshots from captured screenshots without safe preview links.
- Unsafe screenshot paths/URLs are hidden: absolute Unix/Windows paths, traversal, `file:`, `data:`, `javascript:`, and external `http(s):` refs.

Overlay decision:
- Deferred. There is no safe screenshot-serving endpoint/URL contract in scope, so rendering image overlays would require unsafe local path links or a backend endpoint beyond the clean R8.3 UI-only path. Bounding box and related overlap evidence remain displayed as text.

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
- No screenshot image preview/overlay until a path-policy-safe artifact serving endpoint or safe public artifact URL exists.
- No screenshot gallery, auth UI, autofix, OCR, or image analysis.

Next recommended phase:
- R8.4 — next roadmap phase

## R8.4 — Runtime Artifact Detail API & Evidence Model Hardening

Status: completed.

Implemented:
- Added strict public runtime artifact detail/evidence contracts and validators.
- Added `GET /api/report/runtime/latest` using selected-root path-policy and runtime artifact repository reads only; no scan rerun.
- Added `GET /api/report/runtime/screenshot?ref=<opaque>` with opaque ref lookup, traversal/absolute-ref rejection, realpath containment, PNG-only serving, and no raw path response.
- Runtime detail maps issues to target, route, state metadata, viewport, selector/element, bounding boxes, deterministic reason/dedup keys, and screenshot available/ref/missing reason.
- UI refresh loads public-safe detail after latest-report summary and keeps screenshot refs opaque.

Security:
- Internal `projectRoot`, `selectedRoot`, artifact paths, screenshot paths, raw runtime errors, auth/storage data, and raw stack are not returned.
- Missing/malformed/invalid/read failures use typed public errors.

Known limitations:
- R8.4 does not render screenshot images or overlays.
- Route/target selection UI remains R8.5.

Next recommended phase:
- R8.5 — Route / Target Selection Runtime Scan UI

## R8.5 — Route / Target Selection Runtime Scan UI

Status: completed.

Implemented:
- Reports UI maps selectable page routes from the production graph with a safe latest-runtime detail fallback.
- Routes are validated and deduplicated before rendering; no raw graph/internal path data is passed into the control component.
- Runtime scan requires an explicit selected-routes or all-routes mode and never runs on page open or refresh.
- Selected-routes requests send the existing strict `RuntimeScanRequest` shape; missing, unknown, traversal, absolute filesystem, backslash, and `.lutest` routes are rejected before API invocation.
- Static scan remains available and unchanged; successful scans continue reloading graph, latest report, and R8.4 runtime detail.

Known limitations:
- No configured flow/state target catalog is publicly available, so R8.5 exposes route targets only and does not invent a new backend API.
- Screenshot image rendering and bounding-box overlay remain R8.6.

Next recommended phase:
- R8.6 — Screenshot Overlay Evidence UI

## R8.6 — Screenshot Overlay Evidence UI

Status: completed.

Implemented:
- Selected runtime issues render screenshot evidence through `GET /api/report/runtime/screenshot?ref=<opaque>` only.
- Runtime capture locks screenshot width to the audited viewport while retaining full vertical document height, so horizontal overflow remains visibly outside the viewport instead of expanding the evidence image.
- Primary and related bounding boxes render over an issue-focused viewport crop; legacy expanded-width screenshots are cropped rather than compressed.
- Image loading/error and all four public missing reasons render explicit fallback states; textual evidence remains available.
- Legacy raw screenshot paths are no longer accepted by the UI view model as safe refs.
- An all-issues dropdown selects any issue, synchronizes filters, and updates screenshot evidence immediately without scrolling to the issue list.
- Screenshot annotations use a compact opposite-side label with a long leader arrow; full details render below the image instead of covering the target.
- Zero-size evidence gets a point marker; fully outside evidence gets a directional edge marker.
- Runtime layout detection ignores React Flow/XYFlow transformed viewport infrastructure to avoid pan/zoom false positives.
- Runtime report view-model also suppresses those selectors from already-stored artifacts, so users do not need a new scan merely to hide the known false positive.
- Annotation cards use a larger offset and longer, thicker arrow for clearer target association.
- Fully outside elements are no longer double-reported as horizontal overflow, and ancestor/descendant overflow sharing one boundary keeps the leaf evidence only.

Security:
- URL generation accepts only `shot_<32-hex>` refs and never builds public URLs from absolute or `.lutest` paths.
- Backend screenshot validation, selected-root path-policy, and local-only runtime base URL behavior remain unchanged.

Known limitations:
- Overlay is evidence-only UI; no runtime browser interaction or new capture is triggered.
- Interaction/state discovery remains R8.7.

Next recommended phase:
- R8.8 — Visual Readability / OKLCH Contrast Engine

## R8.7 Coverage And Diagnostics Hardening

- Default interaction capacity derives from configured state capacity and viewport count, so earlier viewports cannot starve desktop discovery.
- Every captured bounded state receives screenshot evidence; the redundant independent screenshot cap was removed while target/state/time bounds remain enforced.
- Latest runtime detail includes strict typed public-safe browser diagnostics with resource-console deduplication.
- Reports separates browser diagnostics from scanner failures and shows unique states, snapshot count, and viewport coverage.
- Live fixture result: 27 intended issues, 30 screenshots, 15 typed diagnostics, zero missing screenshots, zero scanner failures.

## R8.7 — Safe Interaction Discovery

Status: completed.

Implemented:
- Added strict opt-in `interactionDiscovery` request config with bounded interaction/state/time limits.
- Runtime route scans capture a baseline plus public-safe discovered state snapshots after allowlisted semantic clicks.
- Disabled, required-input, destructive, unknown, hidden, navigation-risk, unsupported, duplicate, and limit-reached candidates retain typed skipped reasons.
- State signatures hash normalized visible geometry/text summaries; repeated states and repeated layout issues are deduplicated.
- Public runtime responses omit internal screenshot paths/raw geometry and redact sensitive diagnostics; latest runtime detail maps state/source/skipped metadata through the existing safe screenshot model.
- Scans UI can opt into discovery without changing the route request shape; Reports exposes discovered state labels and skipped reasons separately from route targets.

Safety ceiling:
- One safe click from a reloaded route baseline only.
- No input fill, submit/reset, auth/login automation, route navigation, payment, save, delete, logout, confirm, or destructive action.

Next recommended phase:
- R8.8 — Visual Readability / OKLCH Contrast Engine
