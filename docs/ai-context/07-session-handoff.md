# Session Handoff

## Phase Completed

R8.7 — Safe Interaction Discovery.

## Summary

R8.7 adds strict opt-in, bounded safe interaction discovery to route runtime scans. Scans exposes the opt-in checkbox; Reports keeps targets as routes while showing discovered state labels, State filtering, and typed skipped-control reasons.

## Changed Files From Latest Phase

- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-interaction-discovery.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-interaction-discovery.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan-limits.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.ts`
- `apps/worker-node/src/modules/report/runtime-artifact-detail.service.ts`
- `apps/ui/src/components/runtime/runtime-scan-controls.tsx`
- `apps/ui/src/components/runtime/runtime-report-panel.tsx`
- `apps/ui/src/lib/runtime-scan-selection.ts`
- `apps/ui/src/lib/runtime-scan-selection.self-check.ts`
- `apps/ui/src/lib/runtime-report-view-model.ts`
- `apps/ui/src/lib/runtime-report-view-model.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

## What Changed

- Added strict `interactionDiscovery` request config and route-wide interaction/state/time limits.
- Added semantic candidate classification for tabs, dropdowns, dialogs, accordions, drawers, menus, toggles, and filter/sort triggers.
- Added typed skipped reasons for disabled, required-input, destructive, unsafe, hidden, route-risk, limit, duplicate, and unsupported candidates.
- Added baseline/discovered state labels, public-safe interaction source, SHA-256 state signatures, and issue deduplication.
- Removed internal screenshot paths/raw geometry from public scan output and redacted sensitive diagnostics.
- Added explicit Scans discovery opt-in, Reports State filtering, and compact skipped-control reason visibility.

## Verification

- Required workspace typecheck and contracts/worker/UI builds passed.
- Required contracts, runtime artifact, latest-report mapper/integration, and path-policy HTTP self-checks passed.
- R8.7 deterministic Playwright interaction discovery self-check passed.
- Runtime schema/layout detector/public adapter/runtime detail/playwright regressions passed.

## Current Limitations

- Discovery is one safe click deep from a reloaded baseline; no chained flow crawler exists.
- No configured flow/state target catalog, auth UI, contrast engine, form fill, submit, navigation, or destructive action was added.

## Next Recommended Phase

R8.8 — Visual Readability / OKLCH Contrast Engine.

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

## Runtime evidence correctness addendum

- Chromium screenshot capture uses a viewport-width CDP clip with full vertical document height; horizontal overflow no longer expands the PNG width.
- Detector precedence emits `element-outside-viewport` without a duplicate `horizontal-overflow` for the same fully outside element.
- DOM lineage supports deduping ancestor/descendant overflow that shares the same physical edge.
- Reports focuses each full-height screenshot around the selected issue, crops legacy expanded-width images, marks zero-size/offscreen evidence, and keeps detailed text below the image.
- Production fixture asserts exact screenshot width, clean interaction baseline geometry, outside-viewport precedence, and all R8.7 interaction states.
- Current next recommended phase remains R8.8 — Visual Readability / OKLCH Contrast Engine.

### R8.7 coverage and diagnostics hardening

- Default route interaction budget now derives from configured state capacity and viewport count; mobile/tablet discovery no longer exhausts desktop coverage.
- Removed the independent screenshot count cap. Existing target/state/time bounds remain mandatory and every captured state receives screenshot evidence.
- Runtime artifact detail exposes strict typed browser diagnostics with redaction and resource-console deduplication; no raw path, storage/auth value, or stack is returned.
- Reports separates browser diagnostics from scanner failures and shows unique states, discovered snapshots, and viewport coverage explicitly.
- Production fixture requires all four safe states at 390, 768, and 1440 widths, exact 27 intended issues, and screenshot evidence for every captured state.
- Next recommended phase remains R8.8 — Visual Readability / OKLCH Contrast Engine.
