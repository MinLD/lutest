# Current State

## Latest Completed Phase

R6.0.2 — Runtime Browser Preflight.

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

From current R6.0.2 session:

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
- Runtime browser preflight self-check — passed.
- Runtime scan self-check — passed.
- Production graph accuracy audit for `D:/Projects/lutest/apps/ui` — passed.
