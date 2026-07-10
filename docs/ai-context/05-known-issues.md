# Known Issues And Limitations

## Runtime Scan

- Public runtime contracts are exposed and `/api/actions/scan` can execute runtime scan when explicitly opted in.

- Layout issue detection is heuristic-only and does not include contrast, OCR, or AI analysis.

- Auth storageState is implemented as manual, local, selected-root-scoped state. UI for starting/clearing auth is not implemented yet.
- Auth session self-check uses mocked manual browser interaction; real manual login requires a user-driven Playwright browser session.

- Latest report now exposes runtime summary/meta and safe artifact refs, but UI dashboard rendering for these fields remains future work.
- No contrast issue detection yet.
- Missing Playwright Chromium is reported by runtime browser preflight as `PLAYWRIGHT_BROWSER_MISSING` with remediation `npx playwright install chromium`.

## Graph

- Legacy backend `/api/graph` remains intentionally as compatibility/debug.
- Production UI should not call legacy `/api/graph` in normal flow.
- Production graph persists latest artifact only; timestamped production graph snapshots are not added yet.
- Production graph has known staged scope; future phases may improve dependency chains and runtime connections.

## Environment

- PowerShell `npm.ps1` / `npx.ps1` may print `Test-Path : Access is denied` while command exits `0`. Treat as known local environment noise unless exit code fails.
- Generated `.lutest` artifacts may change during verification. Do not commit unless intentionally part of task.

## Path Policy

- Strict path-policy is expected behavior.
- `PATH_NOT_ALLOWED` means selected project path is outside worker allowed root, not worker offline.

## Documentation

- This context package can become stale. Future AI sessions must verify against code and progress doc.

- Public runtime artifact detail and opaque screenshot endpoints exist; screenshot image rendering/overlay remains deferred.

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

Current limitations:
- Screenshot endpoint serves safe PNG evidence, but current UI only consumes opaque refs/detail data; image preview and bounding-box overlay are later phases.
- Detail endpoint reads latest runtime artifact only; historical scan selection is not exposed.
- Route/target selection UI is not part of R8.4.

Next recommended phase:
- R8.5 — Route / Target Selection Runtime Scan UI
