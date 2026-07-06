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
9. `docs/plan/production-refactor-progress.md` for phase details

## Current Snapshot

- Product: Lutest, local-first code/UX audit platform.
- Primary graph path: production graph.
- Latest completed phase recorded here: R5.9 — MVP legacy cleanup and production cutover.
- Next recommended phase: R6.1 — DOM Geometry extraction and viewport scan.
- Production graph persists latest artifact at `<projectRoot>/.lutest/graph/latest-production-graph.json`.
- Default UI graph data flow calls `/api/graph/production`, not legacy `/api/graph`.
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
