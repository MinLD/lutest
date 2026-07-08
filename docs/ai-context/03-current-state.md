# Current State

## Latest Completed Phase

R6.7 — Runtime Layout Issue Engine.

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

From current R6.7 session:

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
