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

- Runtime artifact repository is implemented for latest/meta/snapshot, but no public runtime artifact API endpoint is exposed yet.

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
