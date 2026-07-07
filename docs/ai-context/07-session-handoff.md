# Session Handoff

## Phase Completed

R6.0.2 — Runtime Browser Preflight.

## Summary

R6.0.2 added a Playwright Chromium preflight before real runtime scan browser work. Missing Chromium is classified as `PLAYWRIGHT_BROWSER_MISSING` with remediation `npx playwright install chromium`. Generic launch failures are classified as `PLAYWRIGHT_BROWSER_LAUNCH_FAILED`. The scan result shape, public contracts, `/api/actions/scan`, and DOM Geometry remain unchanged.

## Audit Before Change

- Browser launch errors previously escaped from `chromium.launch()` inside `runPlaywrightRuntimeScan` and rejected the service call.
- `runPlaywrightRuntimeScan` returned `RuntimeScanResult` on scan completion, but threw for invalid baseUrl, path-policy failure, route discovery validation, artifact path failure, and browser launch failure.
- Existing self-check expected config/path errors to reject, successful routes to produce screenshots, and unreachable route navigation to be captured in `routes[0].error` with no `screenshotPath`.
- Route-level errors were recorded per route via `error`, `screenshotError`, `consoleMessages`, `pageErrors`, `networkErrors`, and `failedResponses`.
- Config/baseUrl errors were modeled as thrown `Error("Runtime scan baseUrl must be a local HTTP(S) URL")` before artifacts/browser work.

## Changed Files From Latest Phase

- `apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

## What Changed

- Added `runPlaywrightBrowserPreflight()` to launch bundled Playwright Chromium headless and close it.
- Added `classifyPlaywrightBrowserError()` with sanitized `PLAYWRIGHT_BROWSER_MISSING` and `PLAYWRIGHT_BROWSER_LAUNCH_FAILED` results.
- Added `PlaywrightBrowserPreflightError` exposing `code` and optional `remediation` without raw stack text in the message.
- Runtime scan now runs preflight before creating the real scan browser.

## Tests Run

- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run typecheck --workspaces --if-present` — passed.
- PowerShell `npm.ps1` / `npx.ps1` printed known `Test-Path : Access is denied` noise, commands exited `0`.

## Result

R6.0.2 completed. Next phase should be R6.1 — Runtime Internal Contracts, Limits & Artifact Shape.

## Known Limitations

- Runtime scan is still internal service/self-check and is not integrated into `/api/actions/scan` response shape.
- No DOM Geometry extraction yet.
- No viewport matrix yet.
- No layout overlap/contrast issue detection yet.
- Backend legacy `/api/graph` still exists for compatibility/debug.
