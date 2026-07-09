# Session Handoff

## Phase Completed

R7.1 — Public Runtime Contracts.

## Summary

R7.1 added public runtime contracts and validators only. Runtime scan remains opt-in via `ScanRequest.runtimeScan`; old scan/latest shapes still validate when runtime fields are absent. No runtime scan execution was wired into `/api/actions/scan` in this phase.

## Changed Files From Latest Phase

- `packages/contracts/src/index.ts`
- `packages/contracts/src/validators.self-check.ts`
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`

## What Changed

- Added public runtime request/result/target/viewport/DOM geometry/layout issue/artifact meta/error types.
- Added optional `ScanRequest.runtimeScan`, `ScanResponse.runtimeScan`, `LatestReportResponse.runtimeScan`, and `LatestReportResponse.runtimeArtifactMeta`.
- Added validators for runtime request, result, DOM geometry, layout issue, artifact meta, and scan/latest runtime fields.
- Runtime request validation requires `enabled: true` and local HTTP(S) `baseUrl` only.
- External, credential, `file:`, `data:`, and `javascript:` base URLs are rejected.
- Flow validator enforces fill value source, destructive click opt-in, bounded wait timeout, known target kinds, and known step kinds.
- Public layout issue `code`, if present, must equal `type`.

## Tests Run

- `npm run typecheck --workspaces --if-present` — passed.
- `npm run build -w @lutest/contracts` — passed.
- `npm run build -w @lutest/worker-node` — passed.
- `npx tsx ./packages/contracts/src/validators.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-schema.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-layout-issue-detector.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-manual-flow.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-browser-preflight.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts` — passed.
- `npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts` — passed.

## Known Limitations

- `/api/actions/scan` does not execute runtime scan yet.
- Latest report does not read runtime artifacts yet.
- No UI runtime toggle.
- Auth StorageState remains deferred to R7.4.

## Result

R7.1 completed. Next phase should be R7.2 — Scan Service Integration.
