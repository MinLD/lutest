# Lutest

Local-first UI quality auditing for web applications using Playwright, deterministic rules, DOM geometry, screenshot evidence, and an interactive report dashboard.

> **Project status: developer preview.** Runtime scanning, screenshot evidence, geometry findings, WCAG contrast/readability evidence, safe interaction discovery, and the dashboard are implemented. Full WCAG coverage, runtime-to-source component mapping, portable report export, and fully bundled dashboard distribution are still in development.

## What Lutest does

Lutest inspects both the source structure and the running UI of a local web project. It can:

- Discover supported React/Next.js pages, components, imports, API clients, and endpoints.
- Run an opt-in Playwright scan against a local HTTP(S) application.
- Audit mobile (`390×844`), tablet (`768×1024`), and desktop (`1440×900`) viewports.
- Capture bounded DOM geometry and full-height PNG screenshots.
- Detect horizontal overflow, elements outside the viewport, small closely spaced click targets, suspicious clickable overlap, and visible zero-size elements.
- Discover a bounded set of safe one-click UI states such as tabs, menus, accordions, drawers, dialogs, and toggles.
- Collect console, page, network, and failed-response diagnostics.
- Show the affected route, state, viewport, selector, bounding box, screenshot, and overlay.
- Persist the latest report and runtime artifacts inside the scanned project.

Lutest does **not yet** provide complete WCAG conformance testing or reliable React component/source-line mapping. AABB is used as a geometry technique; text contrast pass/fail uses WCAG contrast ratio with OKLCH evidence and deterministic color suggestions.

## Architecture

```text
Browser dashboard (Next.js, port 3000)
                │ HTTP API
                ▼
Worker (Express, default port 6532)
        ├── source/project discovery
        ├── production graph
        ├── static rules
        ├── Playwright runtime scanner
        ├── geometry detector
        └── report/artifact repository
                │
                ▼
       <target project>/.lutest/
```

The repository is an npm-workspaces monorepo:

```text
apps/
  cli-host/       Experimental worker lifecycle host
  worker-node/    Express API, scanner, rules, reports, artifacts
  ui/             Next.js dashboard
packages/
  contracts/      Shared public API contracts and validators
fixtures/
  runtime-audit-lab/  Intentionally broken Next.js test application
```

## Requirements

- Node.js 20 or newer. Node.js 22 LTS is recommended.
- npm 10 or newer.
- A supported Playwright Chromium installation.
- The web application being audited must be running locally.

The current runtime API accepts only `localhost`, `127.0.0.1`, or `::1` HTTP(S) base URLs. This is an intentional security restriction.

## Installation from npm

The public package name is scoped because `lutest` is already taken on npm. The installed command is still `lutest`.

Run once without global install:

```bash
cd /absolute/path/to/your-project
npx @minld/lutest
```

Or install globally:

```bash
npm install -g @minld/lutest
cd /absolute/path/to/your-project
lutest
```

Project root detection order:

```text
--project <path>
LUTEST_PROJECT_PATH from the current directory's .env
current working directory
```

Examples:

```bash
lutest --project /absolute/path/to/your-project
LUTEST_PROJECT_PATH=/absolute/path/to/your-project lutest
```

The npm CLI starts the local Lutest worker with the selected project as the allowed root. Keep the audited web application running on a local URL before starting a runtime scan.

## Installation from source

Clone the repository and install dependencies:

```bash
git clone <your-lutest-repository-url>
cd lutest
npm ci
npx playwright install chromium
```

On Linux, if Chromium reports missing system libraries, use Playwright's supported dependency installation command for your environment:

```bash
npx playwright install --with-deps chromium
```

Do not use `npm install -g lutest`; that unscoped package name belongs to another npm maintainer. Use `@minld/lutest`.

## Quick start

Lutest needs three processes during development:

1. The target application you want to audit.
2. The Lutest worker.
3. The Lutest dashboard.

### 1. Start the target application

Run the target project on a local port. For example:

```bash
cd /absolute/path/to/your-project
npm run dev -- --port 3400
```

Confirm that it opens at `http://127.0.0.1:3400` or another local URL.

### 2. Start the Lutest worker

From the Lutest repository:

```bash
PORT=6532 \
LUTEST_PROJECT_PATH=/absolute/path/to \
npm run dev:worker
```

`LUTEST_PROJECT_PATH` is the allowed root. The project selected in the dashboard must be that directory or a child of it. For the narrowest access, point it directly at the target project:

```bash
PORT=6532 \
LUTEST_PROJECT_PATH=/absolute/path/to/your-project \
npm run dev:worker
```

Check worker health:

```bash
curl http://localhost:6532/api/status
```

### 3. Start the dashboard

In another terminal, from the Lutest repository:

```bash
npm run dev -w ui
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard uses `http://localhost:6532` by default. To use a different worker URL:

```bash
NEXT_PUBLIC_LUTEST_WORKER_URL=http://localhost:6532 npm run dev -w ui
```

Keep the dashboard on port `3000` in the current version because the worker CORS policy explicitly allows `http://localhost:3000`.

### 4. Run a scan

In the dashboard:

1. Select the target project directory.
2. Open **Scans**.
3. Enter the local base URL of the running target application.
4. Select specific routes or choose all discovered routes.
5. Optionally enable safe interaction discovery.
6. Run the scan.
7. Open **Reports** to inspect findings and screenshot evidence.

Runtime scanning never starts automatically when the dashboard opens or refreshes.

## API examples

### Static scan only

```bash
curl -X POST http://localhost:6532/api/actions/scan \
  -H 'content-type: application/json' \
  -d '{
    "projectPath": "/absolute/path/to/your-project"
  }'
```

### Runtime scan for selected routes

```bash
curl -X POST http://localhost:6532/api/actions/scan \
  -H 'content-type: application/json' \
  -d '{
    "projectPath": "/absolute/path/to/your-project",
    "runtimeScan": {
      "enabled": true,
      "baseUrl": "http://127.0.0.1:3400",
      "routes": ["/", "/products"],
      "discoveryMode": "selected-routes",
      "viewportPreset": "default"
    }
  }'
```

### Runtime scan with safe interaction discovery

```bash
curl -X POST http://localhost:6532/api/actions/scan \
  -H 'content-type: application/json' \
  -d '{
    "projectPath": "/absolute/path/to/your-project",
    "runtimeScan": {
      "enabled": true,
      "baseUrl": "http://127.0.0.1:3400",
      "routes": ["/"],
      "discoveryMode": "selected-routes",
      "interactionDiscovery": {
        "enabled": true,
        "maxStatesPerRoute": 6,
        "timeoutMs": 10000
      }
    }
  }'
```

Safe discovery is intentionally limited. It skips disabled, destructive, input-dependent, navigation-risk, hidden, unsupported, duplicate, and limit-reached candidates. It does not submit forms, fill credentials, save, delete, pay, log out, or confirm destructive actions.

### Read reports

```bash
curl 'http://localhost:6532/api/report/latest?path=/absolute/path/to/your-project'

curl 'http://localhost:6532/api/report/runtime/latest?path=/absolute/path/to/your-project'
```

Screenshots are served only through validated opaque references returned by the runtime detail endpoint. Raw filesystem screenshot paths are not public API.

## Run the included audit fixture

The repository contains an intentionally broken Next.js application covering geometry, interactions, diagnostics, static rules, and future readability cases.

Build and start it:

```bash
npx next build fixtures/runtime-audit-lab
npx next start fixtures/runtime-audit-lab -H 127.0.0.1 -p 3400
```

In another terminal, start the worker with the fixture parent as its allowed root:

```bash
PORT=6532 \
LUTEST_PROJECT_PATH="$(pwd)/fixtures" \
npm run dev:worker
```

Start the dashboard:

```bash
npm run dev -w ui
```

Select `fixtures/runtime-audit-lab`, use `http://127.0.0.1:3400`, select the fixture routes, and enable safe interaction discovery.

## Artifacts

Lutest writes generated data inside the selected project:

```text
.lutest/
  latest-report.json
  reports/
  graph/
    latest-production-graph.json
    latest-production-graph.meta.json
  runtime/
    latest-runtime-scan.json
    latest-runtime-scan.meta.json
    scans/
    screenshots/
  auth/
    storage-state.json
    storage-state.meta.json
```

Add `.lutest/` to the target project's `.gitignore` unless you intentionally manage sanitized fixtures:

```gitignore
.lutest/
```

Artifacts may contain UI text, screenshots, routes, and diagnostics. Treat them as local audit data even though public API responses redact sensitive fields and absolute paths.

## Development commands

```bash
# Worker development server
npm run dev:worker

# Dashboard development server
npm run dev -w ui

# Typecheck workspaces that define a typecheck script
npm run typecheck --workspaces --if-present

# Build shared contracts first, then worker and UI
npm run build -w @lutest/contracts
npm run build -w @lutest/worker-node
npm run build -w ui

# Lint available workspaces
npm run lint
```

The current root `npm run build` is not a reliable clean-checkout command because npm workspace execution can build the UI before `@lutest/contracts`. The commands above use the required dependency order until the P0 build repair is implemented.

## Production-style local run

Build in dependency order:

```bash
npm ci
npx playwright install chromium
npm run build -w @lutest/contracts
npm run build -w @lutest/worker-node
npm run build -w ui
```

Start the compiled worker:

```bash
PORT=6532 \
LUTEST_ENV=production \
LUTEST_PROJECT_PATH=/absolute/path/to/your-project \
node apps/worker-node/dist/main.js
```

Start the dashboard in another terminal:

```bash
NEXT_PUBLIC_LUTEST_WORKER_URL=http://localhost:6532 \
npm run start -w ui
```

This is a local production-style run, not a supported hosted deployment. The current security and path model is designed for local projects.

## Experimental CLI host

The root command below starts only the worker lifecycle host:

```bash
npm run dev
```

It allocates a random worker port, performs a health check, and keeps the worker alive. It does **not** start the dashboard or automatically configure the dashboard with that random port. Use the explicit worker + UI quick-start flow above for normal development.

## Troubleshooting

### `PLAYWRIGHT_BROWSER_MISSING`

Install the matching Chromium browser:

```bash
npx playwright install chromium
```

### `PATH_NOT_ALLOWED`

The selected project is outside `LUTEST_PROJECT_PATH`, does not exist, is not absolute, or points into a blocked generated directory. Restart the worker with an allowed parent or the exact target project.

### `BASE_URL_NOT_LOCAL`

Use a local HTTP(S) URL with `localhost`, `127.0.0.1`, or `::1`. External sites, credentials in URLs, `file:`, `data:`, and `javascript:` URLs are rejected.

### Dashboard cannot reach the worker

Confirm:

```bash
curl http://localhost:6532/api/status
```

Then verify that the UI uses `NEXT_PUBLIC_LUTEST_WORKER_URL=http://localhost:6532` and runs on `http://localhost:3000`.

### UI build cannot resolve `@lutest/contracts`

Build contracts first:

```bash
npm run build -w @lutest/contracts
npm run build -w ui
```

### Authenticated pages

Manual Playwright storage-state support exists, but the complete dashboard auth workflow is not finished. Authentication is opt-in and project-scoped; Lutest does not automatically fill credentials.

## Current limitations

- Contrast, OKLCH readability, OCR, and image-based analysis are not implemented.
- Automated WCAG/axe coverage is not implemented yet.
- Geometry overlap remains heuristic and currently focuses on clickable elements.
- Runtime DOM elements do not reliably map back to React component symbols or source lines.
- Interaction discovery is one safe click deep, not a general crawler.
- Configured state/flow targets do not yet have a complete public dashboard catalog.
- Latest runtime detail is exposed; historical scan selection and baseline comparison are not.
- Reports are dashboard/JSON artifacts; standalone HTML, SARIF, and PDF export are not implemented.
- Chromium is the current primary runtime browser.
- The CLI is not packaged for npm installation.

## Security model

- Runtime base URLs are local-only.
- Project paths must remain under a configured allowed root.
- Generated and sensitive path segments are blocked by path policy.
- Screenshot access uses opaque references plus realpath containment and PNG validation.
- Runtime flows redact fill values from artifacts.
- Public report contracts omit raw storage state, cookies, tokens, passwords, absolute project paths, and raw browser stacks.
- Destructive interaction discovery is blocked by default.

These controls reduce risk but do not make arbitrary local web applications trusted. Run Lutest with the minimum filesystem access needed for the selected project.

## Roadmap

The production roadmap is organized around:

1. Clean build/test/CI quality gates.
2. ACT-style versioned rule contracts.
3. WCAG 2.2 AA and axe-core integration.
4. WCAG contrast with OKLCH evidence and repair suggestions.
5. Hardened geometry/AABB analysis.
6. Keyboard and ARIA behavior checks.
7. Runtime-to-source component mapping.
8. Scan history, baselines, HTML/SARIF export, and CI policies.
9. Installable CLI, security hardening, cross-browser coverage, and manual UX review.

See `LUTEST_MASTER_PLAN.md` for detailed phases and definitions of done.

## License

No license is declared in the current repository. Add an explicit license before public distribution or accepting external contributions.
