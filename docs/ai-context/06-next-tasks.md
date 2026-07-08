# Next Tasks

## Next Recommended

R6.8 — Runtime Artifact Repository Hardening.

## R6.8 Goal

- Harden runtime artifact repository now that DOM geometry, viewport matrix, manual flows, and layout issues all use the artifact shape.
- Preserve strict path-policy and validated latest/snapshot writes.
- Keep public API contracts unchanged unless explicitly scoped.

## Later Runtime Phases

- R7.1 — Public Runtime Contracts.
- R7.2 — Scan Service Integration.

## Non-Goals For R6.8 Unless Requested

- No public API contract exposure.
- No `/api/actions/scan` integration.
- No UI work.
- No Auth StorageState.
- No path-policy loosening.
- No production graph rewrite.
- No legacy graph migration.
