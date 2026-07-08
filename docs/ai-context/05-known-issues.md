# Known Issues And Limitations

## Runtime Scan

- Internal service/self-check exists, but it is not integrated into `/api/actions/scan` response shape yet.
- State and flow targets are placeholders only; R6.3 does not execute steps or app states.
- No layout overlap/contrast issue detection yet.
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

- Runtime artifact repository is implemented for latest/meta/snapshot, but no public runtime artifact API is exposed yet.
