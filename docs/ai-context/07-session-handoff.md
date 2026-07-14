# Session Handoff

## Current Session Addendum — R8.10 Auth / Flow Controls UI

Status: implemented, not yet committed.

Implemented:
- Scans UI loads safe auth status and shows status/date/error metadata only.
- Scans UI can start manual auth through existing backend auth endpoint using local base URL, optional success URL/selector, and bounded timeout.
- Scans UI can clear saved auth state.
- Runtime scan request builder supports explicit `auth.useSavedState` opt-in; UI disables it unless auth status is valid.
- Auth start timeout `408` is handled as a typed auth response in the UI client.
- Configured flow target catalog remains absent; UI states the blocker and does not fake flow targets.

Files changed for R8.10:
- `apps/ui/src/lib/api-client.ts`
- `apps/ui/src/lib/runtime-scan-selection.ts`
- `apps/ui/src/lib/runtime-scan-selection.self-check.ts`
- `apps/ui/src/components/runtime/runtime-scan-controls.tsx`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

Verification run:
- `npx tsx ./apps/ui/src/lib/runtime-scan-selection.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/runtime-screenshot-overlay.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-data-request.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-runtime-detail-load.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth-state.repository.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/auth/auth.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts` — passed.
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.

Next recommended phase:
- R9.1 — Full Self-check Matrix.


## Current Session Addendum — R8.9 Runtime Fix Guidance UI

Status: implemented, not yet committed.

Implemented:
- Reports issue detail now renders deterministic remediation guidance for every runtime issue type.
- Guidance includes common causes, CSS/HTML fixes, selector/evidence/viewport context, and explicit limitation text.
- No backend contract, path-policy, screenshot endpoint, OCR, AI analysis, source-file guessing, or automatic source edit was added.

Files changed for R8.9:
- `apps/ui/src/lib/runtime-screenshot-overlay.ts`
- `apps/ui/src/components/runtime/runtime-screenshot-evidence.tsx`
- `apps/ui/src/lib/runtime-screenshot-overlay.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

Verification run:
- `npx tsx ./apps/ui/src/lib/runtime-screenshot-overlay.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/runtime-report-view-model.self-check.ts` — passed.
- `npm run build -w ui` — passed.
- `npm run typecheck --workspaces --if-present` — passed.

Next recommended phase:
- R8.10 — Auth / Flow Controls UI.


## Current Session Addendum — Runtime False-Positive Hardening

Status: implemented, not yet committed.

Context:
- User tested `test_scan/tan/opsi-developer/cli/ui` and saw `element-outside-viewport` on `a.skipLink` / "Skip to content" at `y=-46`.
- Audit showed this is an intentional accessibility skip link hidden above the viewport and expected to appear on keyboard focus.
- The user explicitly requested a production-grade fix without hard-coded class/text/project exceptions.

Implemented:
- DOM geometry now records public-safe `focusBehavior` for offscreen focusable controls by focusing with `preventScroll` and measuring the focused rect.
- Layout detector suppresses `element-outside-viewport`, overlap, and click-target checks for offscreen controls that become visible on focus.
- Offscreen focusable controls that remain hidden after focus still report layout issues.
- Contracts and internal artifact validators now strictly accept `focusBehavior` and reject unknown nested fields.
- This is semantic behavior detection, not a `skipLink`, text, route, or project hard-code.

Files changed in current uncommitted work:
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/07-session-handoff.md`

Verification already run:
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npm run build -w ui` — passed outside sandbox because Turbopack can bind local ports during build.

Not verified live:
- Opsi app at `http://127.0.0.1:3000` was not running during final verification, so the Opsi artifact has not been regenerated after the fix.
- Ask user to restart Opsi and rescan before claiming the live Opsi report is clean.

Important follow-up for next AI:
- Run `git status --short` first.
- Do not commit generated `.lutest` artifacts.
- If committing this fix, stage only the files listed above unless user explicitly asks otherwise.
- Do not kill non-Lutest ports; the previous session accidentally killed a `9Router` process on port `20128`.

## Phase Completed

R8.8 — Visual Readability: WCAG Pass/Fail + OKLCH Evidence.

## Summary

R8.8 uses deterministic WCAG 2.2 text contrast for pass/fail, adds public-safe OKLCH perceptual evidence and validated foreground suggestions, then renders them through the existing Reports evidence card.

## Changed Files From Latest Phase

- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-readability-issue-detector.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-readability-issue-detector.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-oklch.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-oklch.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-dom-geometry.self-check.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/runtime-scan.schema.ts`
- `apps/worker-node/src/modules/report/runtime-artifact-detail.service.ts`
- `apps/worker-node/src/modules/report/runtime-artifact-detail.self-check.ts`
- `apps/ui/src/components/runtime/runtime-screenshot-evidence.tsx`
- `apps/ui/src/lib/runtime-screenshot-overlay.ts`
- `apps/ui/src/lib/runtime-screenshot-overlay.self-check.ts`
- `apps/ui/src/lib/runtime-report-view-model.ts`
- `fixtures/runtime-audit-lab/app/readability/page.tsx`
- `fixtures/runtime-audit-lab/app/globals.css`
- `fixtures/runtime-audit-lab/fixture-catalog.json`
- `fixtures/runtime-audit-lab/README.md`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

## What Changed

- Added direct-text computed-style capture with inherited foreground and solid alpha-background compositing.
- Added WCAG 2.2 relative-luminance detection with 4.5:1 normal-text and 3:1 large-text thresholds.
- Added deterministic sRGB↔OKLCH normalization, foreground/background delta evidence, and gamut-safe foreground suggestions revalidated by WCAG.
- Added strict internal/public contrast evidence contracts and artifact-detail mapping.
- Added Reports foreground/background/suggested swatches, measured ratio, required ratio, OKLCH values, and contrast-specific guidance.
- Added deterministic light, dark, inherited, composited-transparent, hidden/unsupported, and production fixture checks.
- Hardened browser-side text/ARIA redaction, semantic ratio/style validation, typed readability coverage, public viewport normalization, and cached computed style/background resolution.

## Verification

- Required workspace typecheck and contracts/worker/UI builds passed.
- Required contracts, runtime artifact, latest-report mapper/integration, and path-policy HTTP self-checks passed.
- R8.8 DOM geometry, readability detector, runtime detail, overlay, view-model, and production fixture self-checks passed.
- Production fixture emitted exactly 24 intended contrast issues across three viewports.
- Elements fully below the audited viewport are excluded from contrast issues because the current viewport screenshot does not prove them.

## Current Limitations

- Non-uniform image/gradient backgrounds, text shadows, and partially transparent element trees are skipped instead of guessed.
- Suggested fixes change foreground only; no style mutation or automatic source edit occurs.
- No OCR, AI image analysis, automatic source edits, auth UI, or security-policy relaxation was added.

## Next Recommended Phase

R8.9 — Runtime Fix Guidance UI.

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
- Current next recommended phase is R8.9 — Runtime Fix Guidance UI.

### R8.7 coverage and diagnostics hardening

- Default route interaction budget now derives from configured state capacity and viewport count; mobile/tablet discovery no longer exhausts desktop coverage.
- Removed the independent screenshot count cap. Existing target/state/time bounds remain mandatory and every captured state receives screenshot evidence.
- Runtime artifact detail exposes strict typed browser diagnostics with redaction and resource-console deduplication; no raw path, storage/auth value, or stack is returned.
- Reports separates browser diagnostics from scanner failures and shows unique states, discovered snapshots, and viewport coverage explicitly.
- Production fixture requires all four safe states at 390, 768, and 1440 widths, exact 27 intended issues, and screenshot evidence for every captured state.
- Next recommended phase is R8.9 — Runtime Fix Guidance UI.
