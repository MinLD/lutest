# Session Handoff

## Phase Completed

R5.9 — MVP legacy cleanup and production cutover.

## Summary

R5.9 removed frontend legacy/MVP graph UI from normal dashboard flow and cut the default app data path over to production graph only. Backend legacy `/api/graph` remains as deprecated compatibility/debug endpoint because tests and contracts still cover it.

## Changed Files From Latest Phase

- `apps/ui/src/lib/use-dashboard-data.ts`
- `apps/ui/src/components/dashboard-shell.tsx`
- `apps/ui/src/lib/dashboard-navigation.self-check.ts`
- `apps/worker-node/src/modules/graph/graph.routes.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`
- `packages/contracts/src/validators.self-check.ts`
- `docs/plan/production-refactor-progress.md`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/04-decisions.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`

## What Changed

- Removed `GraphMode`, `DEFAULT_GRAPH_MODE`, `SHOW_LEGACY_GRAPH`, and legacy graph loading from `use-dashboard-data.ts`.
- Removed dashboard graph mode toggle and legacy graph panel/components.
- Dashboard normal flow now loads production graph only.
- Marked backend `/api/graph` route as deprecated compatibility/debug.
- Updated production graph accuracy audit expectation to reflect no `useDashboardData->lutestApi.getGraph` call.
- Fixed contracts validators self-check expected project path query shape.

## Tests Run

- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w ui` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts` — passed.
- `npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui` — passed.

## Result

R5.9 completed. Next phase should be R6.1 — DOM Geometry extraction and viewport scan.

## Known Limitations

- Backend legacy `/api/graph` still exists for compatibility/debug.
- `GraphResponse` contracts remain while `/api/graph` exists.
- Timestamped production graph snapshots are not added yet.
- Runtime scan is still internal service/self-check.
- No DOM geometry/viewport matrix/layout detection yet.
- PowerShell `npm.ps1` / `npx.ps1` warning may appear despite successful exit.
