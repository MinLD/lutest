# Next Tasks

## Next Recommended

R7.2 — Scan Service Integration.

## R7.2 Goal

- Integrate opt-in public `runtimeScan` request handling into scan service execution.
- Keep old scan behavior unchanged when `runtimeScan` is absent.
- Preserve strict path-policy and local-only runtime `baseUrl` validation.

## Later Runtime Phases

- R7.3 — Latest Report Integration.
- R7.4 — Auth StorageState Integration.

## Non-Goals For R7.2 Unless Requested

- No UI work.
- No Auth StorageState implementation.
- No path-policy loosening.
- No production graph rewrite.
- No legacy graph migration.
