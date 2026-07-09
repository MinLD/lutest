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
