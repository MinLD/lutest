# Lutest Runtime Audit Lab

Standalone Next.js production fixture. It intentionally contains runtime and static defects; do not copy its UI patterns into production code.

## Routes

- `/layout`: all current geometry issue types plus negative controls.
- `/interactions`: safe SPA states and risky controls that must be skipped.
- `/diagnostics`: real Next API success/503 responses, console errors, page error, and network failure.
- `/readability`: low-contrast, inherited-color, dark-theme, and alpha-composited background cases for R8.8.
- `/static-rules`: source fixtures for `large-file`, `console`, and `todo` rules.

## Production Run

```bash
npx next build fixtures/runtime-audit-lab
npx next start fixtures/runtime-audit-lab -H 127.0.0.1 -p 3400
```

Select `fixtures/runtime-audit-lab` as the Lutest project root, use `http://127.0.0.1:3400`, select the fixture routes, enable safe interaction discovery, then run a new runtime scan.

## Automated Production Verification

```bash
npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-production-fixture.self-check.ts
```

The self-check requires a completed fixture build. It starts the production server, scans with Playwright, asserts runtime/static coverage, then removes generated fixture `.lutest` artifacts.

R8.8 readability cases emit deterministic WCAG AA contrast evidence; the high-contrast card remains a negative control.
