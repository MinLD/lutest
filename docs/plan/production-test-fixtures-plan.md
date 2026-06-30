# Production Test Fixtures Plan

Updated: 2026-06-30
Status: TODO
Canonical path: `docs/plan/production-test-fixtures-plan.md`

## Goal

Create deterministic fixture tests that prove Lutest production analysis works at framework, route, symbol, import, API-client, and graph-edge level.

These tests must fail if implementation regresses to file-level counting only.

## Required fixtures

Initial required fixtures:
- `fixtures/next-basic-shop` — Next.js app with pages/routes, components, local imports, API route, and direct API calls.
- `fixtures/next-custom-api-client` — Next.js app with custom API client wrapper, alias imports, dynamic endpoint case, and component/service call chain.

Future fixtures:
- `fixtures/vite-react-dashboard`
- `fixtures/vue-basic`
- `fixtures/laravel-basic`

## Required assertions

Each production fixture test must assert:
- framework detection is correct.
- route discovery is correct.
- component declaration count is correct.
- page count is correct.
- API route count is correct.
- API client method count is correct.
- render edges are correct.
- call edges are correct.
- http edges are correct.
- `@/*` alias imports resolve when supported.
- dynamic endpoints are not reported as absolute-certain static endpoints.
- graph response exposes production graph mode/version once R4 is complete.

## Status

TODO:
- Create `fixtures/next-basic-shop`.
- Create `fixtures/next-custom-api-client`.
- Add focused graph fixture tests.
- Add import resolver alias tests.
- Add dynamic endpoint confidence tests.
- Wire fixture tests into workspace test/check command.

Not completed:
- No fixture is currently marked done.
- No production graph fixture assertion is currently complete.
