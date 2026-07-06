# Architecture

## UI

- Workspace: `apps/ui`
- Framework: Next 16 + React 19.
- Main dashboard shell: `apps/ui/src/components/dashboard-shell.tsx`.
- Data hook: `apps/ui/src/lib/use-dashboard-data.ts`.
- API client: `apps/ui/src/lib/api-client.ts`.
- Production graph adapter/layout: `apps/ui/src/lib/production-graph-adapter.ts`, `apps/ui/src/lib/production-graph-layout.ts`.
- Navigation model: `apps/ui/src/lib/dashboard-navigation.ts`.

## Worker

- Workspace: `apps/worker-node`
- Server: Express.
- Path policy: `apps/worker-node/src/shared/services/path-policy.service.ts`.
- Validated project path helper: `apps/worker-node/src/shared/http/validated-project-path.ts`.
- Legacy graph endpoint remains `/api/graph`.
- Production graph endpoint remains `/api/graph/production`.
- Canonical scan action route is `/api/actions/scan`; `/api/scan` is legacy alias if present.

## Production Graph

Key files:

- `apps/worker-node/src/modules/graph/production/production-project-scanner.ts`
- `apps/worker-node/src/modules/graph/production/production-node-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-edge-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-builder.ts`
- `apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts`

Supported graph features:

- File nodes.
- Page nodes.
- Component nodes.
- Hook nodes.
- API client method nodes.
- External endpoint nodes.
- Import edges.
- Render edges.
- Call edges.
- Object member call edges.
- HTTP edges.

## Runtime Scan Foundation

Key files:

- `apps/worker-node/src/modules/runtime-scan/playwright-scan.service.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-route-discovery.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.types.ts`
- `apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts`

Runtime scan is internal foundation. It is not yet integrated into `/api/actions/scan` response shape.

## Contracts

- Workspace: `packages/contracts`
- Main export: `packages/contracts/src/index.ts`
- Self-checks cover production graph, validators, and latest report contracts.
