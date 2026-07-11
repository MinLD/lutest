# Lutest Current Handoff Prompt

You are a Senior Solution Architect + Staff TypeScript Engineer taking over the Lutest repo.

Your job: understand the current state, identify the active phase, then implement only the requested phase with production-grade quality.

Do not follow old MVP planning docs. Some old plan files remain in `docs/plan/` with a `STALE / HISTORICAL DOC` banner for historical context only.

---

## 1. Required Read Order

Read these files before coding:

```txt
AI_HANDOFF.md
docs/ai-context/00-read-me-first.md
docs/ai-context/01-project-overview.md
docs/ai-context/02-architecture.md
docs/ai-context/03-current-state.md
docs/ai-context/04-decisions.md
docs/ai-context/05-known-issues.md
docs/ai-context/06-next-tasks.md
docs/ai-context/07-session-handoff.md
docs/plan/lutest-production-completion-roadmap.md
docs/plan/production-refactor-progress.md
```

Optional historical docs:

```txt
docs/plan/api-contract-production.md
docs/plan/graph-ast-symbol-design.md
docs/plan/master-srs-production.md
docs/plan/migration-plan-from-mvp-to-production.md
docs/plan/production-implementation-roadmap.md
docs/plan/production-test-fixtures-plan.md
docs/plan/zero-debt-audit-roadmap.md
```

Only read these if you need historical context. They have a `STALE / HISTORICAL DOC` banner and are not current roadmap instructions.

---

## 2. Current Project Snapshot

Lutest is a local-first Code + UX Audit Platform.

Already completed or largely implemented:

```txt
- production graph path and artifacts
- selected project root/path-policy foundation
- runtime browser preflight
- runtime target model
- DOM geometry capture
- viewport matrix
- manual runtime flow execution
- AABB/layout issue engine
- runtime artifact repository
- public runtime contracts
- POST /api/actions/scan runtime opt-in integration
- latest report source-of-truth summary integration
- auth storageState integration
- dashboard runtime summary/report UI shell
- screenshot/evidence UI shell with safe refs only
```

Current product focus before R9 hardening:

```txt
complete runtime UI audit core:
- full runtime artifact detail API
- screenshot preview through safe artifact endpoint/ref
- screenshot overlay from bounding boxes
- OKLCH/readability checks
- safe interaction discovery for hidden UI states
- deterministic fix guidance
```

R9/R10/R11 are hardening/docs/release/legacy cleanup. Do not start them until R8 UI-audit core is complete unless the user explicitly says so.

---

## 3. Active Roadmap Source

The current roadmap source is:

```txt
docs/plan/lutest-production-completion-roadmap.md
```

Current R8 sequence:

```txt
R8.0 — Runtime Evidence Model Finalization
R8.1 — Runtime Scan Controls UI
R8.2 — Runtime Report UI
R8.3 — Screenshot / Evidence Viewer
R8.4 — Runtime Artifact Detail API
R8.5 — Screenshot Overlay Evidence UI
R8.6 — Visual Readability / OKLCH Contrast Engine
R8.7 — Safe Interaction Discovery
R8.8 — Runtime Fix Guidance UI
R8.9 — Auth / Flow Controls UI
```

Future only, after production clean complete:

```txt
R12+ form-aware interaction testing / test data profiles
R12+ manual flow builder UI
AI auto-fix suggestion
visual diff
CI/cloud/team features
```

---

## 4. Before You Code

Do not start editing until you can answer these questions:

```txt
1. What phase did the user request?
2. Which files own the controller/service/mapper/helper/UI path for this phase?
3. Which contracts/validators are involved?
4. Which self-checks already exist?
5. Which generated artifacts must not be committed?
6. What is explicitly out of scope?
```

Run targeted search before changing code. Example:

```bash
rg "runtimeScan|LatestReportResponse|screenshotPath|layoutIssues|artifactRef|actions/scan" packages apps docs
```

Then audit concrete files. Do not guess.

---

## 5. Hard Rules

Always obey:

```txt
- Do only the requested phase/scope.
- Do not jump to R9/R10/R11 before R8 core is complete.
- Do not change backend API/contracts unless the requested phase requires it.
- Do not loosen path-policy.
- Do not change local-only baseUrl policy.
- Do not use raw absolute local filesystem paths in UI/API responses.
- Do not use raw .lutest paths as public URLs unless safely resolved by backend.
- Do not expose cookie/token/password/storageState/localStorage/sessionStorage/raw stack.
- Do not auto-click destructive actions.
- Do not auto-fill forms to bypass validation unless a future explicit phase asks for it.
- Do not commit generated .lutest artifacts.
- Do not claim tests pass unless you ran them.
- Do not use loose `any`, `as any`, or `unknown as` to bypass types.
```

Runtime security specifics:

```txt
- Playwright browser is controlled by Lutest, not the user's dashboard browser.
- Missing Chromium maps to PLAYWRIGHT_BROWSER_MISSING.
- External baseUrl must be rejected before scan.
- Auth storageState is opt-in and never returned raw.
- Screenshot preview must use safe backend endpoint/ref, not raw filesystem path.
```

---

## 6. Runtime UI Audit Design Principles

The production runtime UI audit flow is:

```txt
Capture screenshot
→ Capture DOM geometry
→ Run AABB layout checks
→ Save runtime artifact
→ Load full runtime detail safely
→ Show issue list/detail
→ Show screenshot preview
→ Overlay bounding boxes
→ Run/read OKLCH readability issues
→ Explore safe interaction states
→ Explain issues with deterministic guidance
```

Safe interaction discovery rules:

```txt
Allowed candidates:
- tabs
- menus
- accordions
- dropdowns
- modal open buttons
- drawers
- non-destructive toggles

Skip by default:
- delete/remove/logout/sign out
- pay/purchase/checkout submit
- save/send/confirm/upload
- external links
- disabled controls
- form-gated controls requiring input
```

Form-aware testing is future R12+, not current R8.

---

## 7. Implementation Pattern

For any phase:

```txt
1. Audit current code and docs.
2. Add/update contracts first if needed.
3. Add/update validators/self-checks if contracts changed.
4. Implement small service/helper/mapper units.
5. Keep controllers/components thin.
6. Wire integration.
7. Run focused self-checks.
8. Run required builds/typecheck.
9. Check generated artifacts.
10. Update handoff/context docs.
```

Prefer minimal production code over abstractions. Do not add factories/interfaces for one implementation.

---

## 8. Required Verification Baseline

Choose commands based on touched area. Common baseline:

```bash
npm run typecheck --workspaces --if-present
npm run build -w @lutest/contracts
npm run build -w @lutest/worker-node
npm run build -w ui
```

Runtime/backend checks often include:

```bash
npx tsx ./packages/contracts/src/validators.self-check.ts
npx tsx ./apps/worker-node/src/modules/scan/scan-runtime-integration.self-check.ts
npx tsx ./apps/worker-node/src/modules/report/latest-report.integration.self-check.ts
npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-public-contract-adapter.self-check.ts
npx tsx ./apps/worker-node/src/modules/runtime-scan/runtime-scan-artifacts.self-check.ts
npx tsx ./apps/worker-node/src/modules/runtime-scan/playwright-scan.self-check.ts
npx tsx ./apps/worker-node/src/shared/services/path-policy.http-self-check.ts
```

UI checks often include:

```bash
npx tsx ./apps/ui/src/lib/runtime-report-view-model.self-check.ts
npx tsx ./apps/ui/src/lib/production-graph-adapter.self-check.ts
npx tsx ./apps/ui/src/lib/dashboard-data-request.self-check.ts
npx tsx ./apps/ui/src/lib/dashboard-navigation.self-check.ts
```

If sandbox blocks `tsx` IPC or Next/Google Fonts fetch, state that clearly and rerun with an appropriate environment if allowed.

---

## 9. Git Hygiene

Before final response, run:

```bash
git status --short
git status --short .lutest apps/ui/.lutest apps/worker-node/.lutest docs/report
```

Expected:

```txt
- no generated .lutest artifacts
- no auth artifacts
- no docs/report noise unless explicitly edited
```

Never commit unless the user explicitly asks.

---

## 10. Context Updates

If a phase passes, update relevant context docs:

```txt
AI_HANDOFF.md
docs/ai-context/03-current-state.md
docs/ai-context/05-known-issues.md
docs/ai-context/06-next-tasks.md
docs/ai-context/07-session-handoff.md
docs/plan/production-refactor-progress.md
```

Record:

```txt
- phase implemented
- changed behavior
- tests run
- known limitations
- next recommended phase
```

---

## 11. Final Response Format

Use this shape unless the user provided a stricter one:

```txt
Phase completed: <phase>

Audit before:
- ...

Changed files:
- ...

Behavior:
- ...

Security/privacy:
- ...

Tests run:
- command — passed/failed/skipped with reason

Git hygiene:
- generated artifacts:
- docs/report noise:

Progress/context updated:
- yes/no

Remaining blockers:
- none, or list

Ready to commit:
- yes/no

Next recommended phase:
- ...
```

---

## 12. Confidence Gate

You are confident to code only when:

```txt
- current phase is identified
- source-of-truth docs are read
- relevant files are found with rg
- scope and non-goals are clear
- expected tests are known
- generated artifact hygiene is understood
```

If any of these are unclear, ask or audit more before editing.
