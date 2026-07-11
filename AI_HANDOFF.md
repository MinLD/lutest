# Lutest AI Handoff

Repo-local context entrypoint for AI/code sessions.

## Read Order

1. `docs/ai-context/00-read-me-first.md`
2. `docs/ai-context/01-project-overview.md`
3. `docs/ai-context/02-architecture.md`
4. `docs/ai-context/03-current-state.md`
5. `docs/ai-context/04-decisions.md`
6. `docs/ai-context/05-known-issues.md`
7. `docs/ai-context/06-next-tasks.md`
8. `docs/ai-context/07-session-handoff.md`
9. `docs/plan/lutest-production-completion-roadmap.md` for current roadmap
10. `docs/plan/production-refactor-progress.md` for detailed phase history
11. `docs/plan/promt.md` for handoff/coding rules

Old MVP/refactor planning files in `docs/plan/` are marked `STALE / HISTORICAL DOC`. Do not follow them as current roadmap instructions.

## Current Snapshot

- Product: Lutest, local-first code/UX audit platform.
- Primary graph path: production graph.
- Latest completed phase recorded here: R8.7 — Safe Interaction Discovery.
- Next recommended phase: R8.8 — Visual Readability / OKLCH Contrast Engine.
- Production graph persists latest artifact at `<projectRoot>/.lutest/graph/latest-production-graph.json`.
- Default UI graph data flow calls `/api/graph/production`, not legacy `/api/graph`.
- Runtime scan artifacts now use hardened repository save/read, atomic latest/meta/snapshot writes, strict path safety, and separated safe metadata under `<projectRoot>/.lutest/runtime/`.
- Public contracts now include opt-in `runtimeScan` shapes, local-only `baseUrl` validation, public runtime result/DOM/layout/meta/error types, and optional scan/latest runtime fields.
- `POST /api/actions/scan` now runs runtime scan only when `runtimeScan.enabled` is present, attaches `ScanResponse.runtimeScan`, persists runtime artifacts via repository, and saves runtime data in latest report payload.
- `GET /api/report/latest` now maps stored reports into a dashboard-safe source-of-truth response with generatedAt, static summary, runtime summary/issue summary, safe artifact refs, and sanitized project metadata.
- Auth storageState support is manual and opt-in: `/api/actions/auth/start`, `/api/actions/auth/clear`, `/api/auth/status`, and `runtimeScan.auth.useSavedState` without exposing raw cookies/tokens/storageState.
- `GET /api/report/runtime/latest` reads the latest runtime artifact through the repository and maps it to a strict public-safe detail response without internal roots or filesystem paths.
- `GET /api/report/runtime/screenshot?ref=<opaque>` serves PNG evidence only after selected-root path-policy, opaque-ref lookup, containment, realpath, extension, and file checks.
- Runtime screenshots keep the audited viewport width while retaining full vertical document evidence; Reports crops/focuses the image around the selected issue without horizontally compressing overflow content.
- Layout detection gives fully outside elements precedence over partial overflow and deduplicates ancestor/descendant overflow sharing the same physical edge.
- Reports UI now maps valid page routes from the production graph, falls back to safe latest-runtime routes, requires an explicit selected/all-routes choice, and sends the strict existing runtime scan contract without auto-running on refresh.
- Runtime scan now supports strict opt-in safe interaction discovery for semantic tabs, menus, disclosures, modal/drawer triggers, toggles, and filter/sort controls with typed skips, route-wide limits, state/issue deduplication, and no form fill, submit, navigation, auth, or destructive clicks.
- R8.7 hardening derives the default interaction budget from state and viewport bounds, captures every bounded state without a separate screenshot cap, preserves desktop interaction coverage, and exposes redacted typed browser diagnostics through latest runtime detail.
- Scans UI exposes an explicit `Discover safe UI states` checkbox; Reports keeps route targets separate from discovered states and adds a State filter plus typed skipped-control summary.
- Working tree may contain uncommitted phase changes; check `git status` before starting.

## Approval Gate

When the user asks a question such as "co nen khong?", "duoc khong?", "nen lam gi?", "test thu xem hieu khong?", or "danh gia giup", answer only. Do not edit files.

Only modify code after an explicit implementation command such as "bat dau phase", "hay sua", "implement", "apply changes", or "code di".

If ambiguous, ask for confirmation.

## API Shape Protection

Do not change shared contracts, API response shapes, ScanRequest, ScanResponse, or `/api/actions/scan` behavior unless the current phase explicitly requires it.

If asked whether an API shape should change, provide risk analysis only and wait for approval.

## Hard Rules For Future AI Sessions

- Do not treat legacy `/api/graph` as primary production graph.
- Do not loosen path-policy to make a failing test pass.
- Do not change API response shapes unless a phase explicitly requests it.
- Do not commit `.lutest` generated artifacts unless intentionally requested.
- Do not record secrets, tokens, cookies, passwords, or full chat logs here.

## Session Prompts

- Start: `docs/ai-context/prompts/start-session-read.md`
- End: `docs/ai-context/prompts/end-session-update.md`
