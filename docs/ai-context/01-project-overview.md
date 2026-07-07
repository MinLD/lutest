# Project Overview

## What Lutest Is

Lutest is a local-first code and UX audit platform. It scans a project, builds a symbol-level production graph, and is evolving toward browser/runtime checks with Playwright.

## Main Goals

- Understand project structure and dependencies.
- Build production graph from source symbols.
- Show graph in UI as primary analysis view.
- Add runtime scan artifacts for screenshots, console/page/network errors, and later DOM geometry/layout issues.

## Current Product Direction

Production graph is primary. Legacy graph remains for compatibility/debug only.

## Repo Shape

- `apps/ui`: Next/React dashboard UI.
- `apps/worker-node`: Express worker, path policy, scan APIs, graph builders, runtime scan foundation.
- `apps/cli-host`: host/dev entrypoint.
- `packages/contracts`: shared API/graph/report contracts and validators.
- `docs/plan`: canonical production docs and phase progress.
- `docs/ai-context`: repo-local AI handoff package.
