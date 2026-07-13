# Lutest NPM One-Command UX Issues

Status: P0 implemented, browser-missing UX hardened in `@minld/lutest@1.0.4`
Priority: P0 for npm usability
Scope: make installed `lutest` usable without manual worker/dashboard wiring.

## Product Goal

After `npm install -g @minld/lutest`, a user should be able to run:

```bash
cd /path/to/user-project
lutest
```

Lutest should detect the current project, start its own services on safe free ports, open the dashboard, and guide or run a runtime scan with minimal manual input.

## Decisions

### 1. Project path and user app port detection

Desired production behavior:

- `lutest` uses `process.cwd()` as the default project root.
- `--project <path>` remains available for monorepo/non-current-root cases.
- The CLI validates the root through existing path policy; no policy relaxation.
- The CLI detects likely frontend app metadata from `package.json`, framework files, and scripts.
- The CLI should detect a local running app port when possible by probing common localhost ports and matching project signals.
- The CLI should not require the user to type a project path in the dashboard.

Port detection priority:

1. `--base-url <url>` explicit override.
2. `LUTEST_RUNTIME_BASE_URL` from project `.env` or shell.
3. Running local ports detected from project dev server hints.
4. If no app is running, start the app in managed mode when safe.
5. If still unknown, dashboard shows a clear guided action, not a blank failure.

Safe common probes:

```txt
3000, 3001, 3002, 5173, 5174, 4173, 4200, 4300, 8080, 8000
```

Do not probe remote hosts. Only `localhost`, `127.0.0.1`, `::1`.

### 2. Should the user have to run their app?

Production target:

- Best UX: user runs only `lutest`.
- Lutest attempts to start the frontend app if a safe dev script is detected.
- User still can run their own app manually and pass `--base-url` for complex setups.

Managed app start policy:

- Detect frontend scripts in `package.json`:
  - `dev`
  - `start`
  - framework-specific scripts such as Next/Vite/Astro when obvious.
- Prefer dev server for local audit.
- Allocate a free app port if the framework supports a port flag.
- Set env vars only for the child process; do not edit user files.
- Stream app logs into Lutest dashboard diagnostics.
- Timebox startup and show actionable failure if app does not become reachable.

Build policy:

- Do not auto-build by default in v1.
- Building can be slow, destructive, or require env/secrets.
- If dev script is missing but build/start exists, show guided commands.
- Future opt-in flag can exist:

```bash
lutest --build-and-start
```

This flag must be explicit because it may run arbitrary project build code.

Recommended v1 behavior:

```txt
If app running: detect baseUrl and scan.
If app not running and dev script exists: start dev server on free local port and scan.
If deps missing: show `npm install` / package-manager-specific command.
If dev server fails: show logs and do not guess fixes.
If no dev script: ask user for baseUrl or command.
```

### 3. Lutest port conflicts

Production behavior:

- Lutest worker must always use a free ephemeral port by default.
- Lutest dashboard must use a free port, default preference `3000` only if free.
- If the user app owns `3000`, Lutest dashboard must choose another port such as `3001` or random free port.
- The CLI wires dashboard to worker via env automatically.
- The CLI prints and opens the final dashboard URL.

No hard-coded required ports.

### 4. Backend inside frontend project

Production behavior:

- Lutest source graph can discover frontend and backend files if they are inside the selected root.
- Runtime UI scan should target frontend route/baseUrl only.
- Backend files should not be browser-scanned as pages.
- Static analysis should classify backend separately when obvious:
  - `server/`
  - `api/`
  - `backend/`
  - Express/Fastify/Nest markers
  - Next API routes
- Do not execute backend scripts automatically in v1.

Reason:

Backend startup may require database secrets, queues, Docker, cloud services, migrations, or paid APIs.

### 5. Does user need to run backend?

Production behavior:

- Lutest should not require backend to start just to test UI layout/readability.
- If UI can render without backend, scan continues and records network/failed-response diagnostics.
- If UI blocks behind backend data, scan reports dependency failure clearly.
- Auto-start backend is future opt-in only.

Future backend managed mode must be explicit:

```bash
lutest --with-backend
lutest --backend-command "npm run dev:api"
```

Guardrails:

- Never auto-run migrations.
- Never auto-run destructive seed/reset commands.
- Never ask for or expose database passwords/tokens.
- Never fix backend config automatically.
- Surface logs and fail safely.

## P0 Implementation Scope

First phase should solve only:

1. Auto-detect project root from cwd.
2. Auto-detect or start frontend app.
3. Auto-pick free worker/dashboard ports.
4. Start dashboard from the npm CLI.
5. Open browser to dashboard.
6. Preload dashboard with selected project and detected runtime baseUrl.
7. Keep existing path policy and local-only baseUrl policy.

Out of scope for P0:

- Backend auto-start.
- Login automation.
- Form fill.
- Remote URL scanning.
- Docker orchestration.
- Auto-build by default.
- CI/cloud mode.

## Acceptance Criteria

```txt
PASS if:
- `cd fixture && lutest` starts worker and dashboard.
- Project path is detected without user input.
- Frontend target app is detected if already running.
- Frontend target app is started if safe `dev` script exists.
- Dashboard opens automatically on a free local port.
- Dashboard shows correct project path/name.
- Runtime scan baseUrl is prefilled with detected app URL.
- Scan can run from UI without manual worker/baseUrl wiring.
- Port conflicts are resolved automatically.
- No raw .lutest paths, absolute filesystem paths, tokens, cookies, or storageState leak to public JSON/UI.
```

## Implementation Notes

- `lutest` defaults to `process.cwd()` and accepts `--project` for monorepos.
- Worker and dashboard use free local ports; dashboard prefers `3000` only when available.
- Frontend dev server starts automatically for safe Next/Vite `dev` scripts, or Lutest uses an already running local app.
- Runtime base URL and selected project are passed into the dashboard through runtime config, not baked build-time env.
- Missing Chromium is detected by the CLI before dashboard startup. Interactive terminals prompt once; declining keeps static/dashboard features available and disables runtime scan in UI with `lutest install-browsers` guidance.
- Browser install is explicit user action. Lutest does not silently download browsers or OS dependencies after the user declines.
- Backend auto-start, auto-build, login automation, remote URL scanning, and Docker orchestration remain out of scope.

## Suggested CLI Shape

```bash
lutest
lutest --project /path/to/project
lutest --base-url http://127.0.0.1:3400
lutest --no-open
lutest --no-start-app
lutest --dashboard-port 3001
```

Defaults should be safe and local-only.
