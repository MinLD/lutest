# Next Tasks

## Next Recommended

R6.2 — Runtime Artifact Repository Foundation.

## R6.2 Goal

- Implement runtime artifact repository save/read behavior behind the R6.1 contract.
- Move the existing Playwright runtime JSON write path into repository code.
- Add latest runtime scan artifact and metadata handling under validated project root.
- Preserve public API response shapes unless the phase explicitly changes them.

## Later Runtime Phases

- R6.4 — DOM Geometry Foundation.
- R6.5 — Viewport Matrix.
- R6.7 — Runtime Layout Issue Engine.
- R6.8 — Runtime Artifact Repository Hardening.

## Non-Goals For R6.2 Unless Requested

- No DOM Geometry implementation.
- No public API contract exposure.
- No path-policy loosening.
- No production graph rewrite.
- No legacy graph migration.
- No broad UI redesign.
