# Session Handoff

## Phase Completed

R8.4 — Runtime Artifact Detail API & Evidence Model Hardening.

## Summary

R8.4 added repository-backed runtime detail reads and opaque screenshot serving. Public JSON is mapped to a strict evidence contract and excludes internal project roots, artifact paths, screenshot filesystem paths, raw runtime errors, auth/storage data, and raw stack. UI refresh loads full safe detail without rerunning runtime scan.

## Changed Files From Latest Phase

- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `packages/contracts/dist/index.d.ts`
- `packages/contracts/dist/index.js`
- `apps/worker-node/src/modules/report/runtime-artifact-detail.service.ts`
- `apps/worker-node/src/modules/report/runtime-artifact-detail.self-check.ts`
- `apps/worker-node/src/modules/report/report.controller.ts`
- `apps/worker-node/src/modules/report/report.routes.ts`
- `apps/worker-node/src/shared/http/validated-project-path.ts`
- `apps/worker-node/src/shared/services/path-policy.http-self-check.ts`
- `apps/ui/src/lib/api-client.ts`
- `apps/ui/src/lib/use-dashboard-data.ts`
- `apps/ui/src/lib/runtime-report-view-model.ts`
- `apps/ui/src/lib/runtime-report-view-model.self-check.ts`
- `apps/ui/src/lib/dashboard-data-request.self-check.ts`
- `apps/ui/src/components/runtime/runtime-report-panel.tsx`
- `apps/ui/src/components/dashboard-shell.tsx`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

## What Changed

- Added strict runtime detail/evidence response, screenshot evidence, opaque-ref query contracts, validators, and typed API errors.
- Added `GET /api/report/runtime/latest` and `GET /api/report/runtime/screenshot?ref=<opaque>`.
- Screenshot serving enforces selected-root path-policy, opaque lookup, lexical containment, realpath containment, `.png` extension, and regular-file checks.
- Added typed missing/malformed/invalid/read/screenshot-not-found errors without raw internal details.
- Dashboard refresh loads full safe runtime detail and maps opaque screenshot refs/missing reasons into the existing report view model.

## Verification

- Required workspace typecheck and contracts/worker/UI builds passed.
- Required contracts, runtime artifact, latest-report mapper/integration, and path-policy HTTP self-checks passed.
- R8.4 runtime artifact detail service/HTTP self-check passed.
- Related UI view-model/request/navigation/graph self-checks passed.

## Current Limitations

- No screenshot image rendering or overlay in R8.4.
- No route/target selection UI in R8.4.

## Next Recommended Phase

R8.5 — Route / Target Selection Runtime Scan UI.

## Historical R7.4 Notes

- Added public auth contracts and validators: `AuthStartRequest`, `AuthStartResponse`, `AuthStatusResponse`, `AuthClearResponse`, and `AuthError`.
- Added auth routes: `POST /api/actions/auth/start`, `POST /api/actions/auth/clear`, and `GET /api/auth/status`.
- Added auth repository for `<projectRoot>/.lutest/auth/storage-state.json` and `<projectRoot>/.lutest/auth/storage-state.meta.json`.
- Auth repository writes JSON atomically and metadata separately.
- Auth status returns only safe summary/ref fields.
- Manual auth session service opens a Lutest-controlled Playwright context and saves `context.storageState()` after a declared success condition or timeout.
- Runtime scan supports `runtimeScan.auth.useSavedState` opt-in and passes storageState path only internally to Playwright `newContext`.
- Missing/invalid auth state maps to `AUTH_STATE_MISSING` / `AUTH_STATE_INVALID`.

## Tests Run

- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth-state.repository.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report.mapper.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/report/latest-report-integration.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

## Known Limitations

- No UI for auth start/status/clear yet.
- Manual auth session self-check uses a mocked session runner; real login requires a user-controlled Playwright window.
- No cloud auth, password manager, OAuth helper, or automatic credential fill.

## Result

R8.3 completed. Next phase should be R8.4 — next roadmap phase.

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
