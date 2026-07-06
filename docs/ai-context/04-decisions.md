# Decisions

## Production Docs Are Canonical

- `docs/plan/` is canonical for production specs and phase progress.
- Old MVP docs are archive/reference only.

## Production Graph Is Primary

- UI should use production graph as primary path.
- Default UI graph data flow must call `/api/graph/production`, not legacy `/api/graph`.
- Legacy `/api/graph` remains for compatibility/debug, not as production source of truth.
- Do not migrate legacy `graph.service.ts` accidentally during unrelated phases.

## Legacy Graph Compatibility

- Backend `/api/graph` remains mounted for compatibility/debug until explicit removal approval.
- `GraphResponse` contracts remain while `/api/graph` exists.
- `lutestApi.getGraph()` may remain as compatibility/debug helper, but normal dashboard flow must not call it.

## API And Validation

- Canonical scan action route: `POST /api/actions/scan`.
- Invalid request boundaries return `400 INVALID_REQUEST` using `ApiErrorResponse` shape.
- Controllers must validate `req.body` and `req.query`; no unsafe boundary casts.

## Path Policy

- Path policy must stay strict.
- Do not allow arbitrary outside paths.
- Selected project path should be inside configured worker allowed root.
- Failing path tests must not be fixed by weakening guards.

## Source Extraction And Graph Boundaries

- Source extractor registry decides supported files.
- Framework adapters own route metadata.
- Production node builder should not hardcode framework route conventions.
- `.d.ts`, test/spec/stories files are excluded from TS/JS extraction.

## Runtime Scan Safety

- Runtime scan accepts only local HTTP(S) `baseUrl`.
- Runtime scan artifacts must stay under validated project root.
- External routes/base URLs are rejected.
- Playwright browser installation is operator-managed.

## Context Maintenance

- AI context files are curated memory, not full history.
- Update after meaningful phase completion.
- If code and context disagree, trust code and update/report context.
