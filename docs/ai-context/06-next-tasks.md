# Next Tasks

## Next Recommended

R9.1 — Full Self-check Matrix.

## R8.8 Status

- Completed: WCAG 2.2 low-text-contrast detection, public-safe OKLCH evidence, deterministic WCAG-valid foreground suggestions, strict validators, screenshot/detail mapping, UI swatches, and production fixture coverage.
- Verified: 24 intended contrast failures across three viewports; unsupported/hidden cases and high-contrast controls avoid false positives.

## R8.9 Status

- Completed: deterministic issue-specific remediation guidance for all runtime issue types in Reports.
- Verified: focused overlay/view-model self-checks, UI build, and workspace typecheck passed.
- Scope held: no backend contract change, OCR, AI analysis, source-file guessing, or automatic source edit.

## R8.10 Status

- Completed: dashboard auth status/start/clear controls and explicit saved-auth runtime scan opt-in.
- Completed: safe browser/auth error messaging and clear configured-flow-catalog blocker.
- Scope held: no raw auth artifacts, credential autofill, form bypass, path-policy loosening, or fake flow targets.

## R9.1 Goal

- Run and close the full production self-check matrix before release hardening continues.
- Keep generated `.lutest` artifacts and auth artifacts out of commits.

## Later Runtime Phases

- R9.1 — Full Self-check Matrix.

## Non-Goals For R8.1 Unless Requested

- No UI work.
- No path-policy loosening.
- No production graph rewrite.
- No legacy graph migration.

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

Implemented:
- Public-safe runtime artifact detail endpoint and strict response validator.
- Opaque screenshot ref endpoint with selected-root/path containment checks.
- Typed missing/malformed/invalid/read errors.
- Minimal dashboard refresh loading of full public-safe runtime detail.

Next recommended phase:
- R8.5 — Route / Target Selection Runtime Scan UI

## R8.5 — Route / Target Selection Runtime Scan UI

Status: completed.

Implemented:
- Explicit selected-routes/all-routes controls with no automatic selection or scan.
- Safe production graph/latest-runtime route mapping, validation, and deduplication.
- Exact existing runtime scan payload construction and invalid-selection API blocking.

Next recommended phase:
- R8.6 — Screenshot Overlay Evidence UI

## R8.6 — Screenshot Overlay Evidence UI

Status: completed.

Implemented:
- Opaque-ref screenshot URL generation and selected issue preview.
- Responsive primary/related bounding-box overlay using natural image dimensions.
- Missing/loading/error fallbacks and strict rejection of raw/invalid screenshot refs.

Next recommended phase:
- R8.9 — Runtime Fix Guidance UI
