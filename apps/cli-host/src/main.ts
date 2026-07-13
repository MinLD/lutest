#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import dotenv from "dotenv";

const cliDir = __dirname;
const packageRoot = path.resolve(cliDir, "../../..");
const requireFromCli = createRequire(__filename);
const localRuntimePorts = [3000, 3001, 3002, 3400, 5173, 5174, 4173, 4200, 4300, 8000, 8080];
const projectFlags = new Set(["--project", "--project-path"]);

type CliOptions = {
  command: "run" | "doctor" | "install-browsers";
  projectPath?: string;
  baseUrl?: string;
  dashboardPort?: number;
  openBrowser: boolean;
  startApp: boolean;
  interactiveBrowserInstall: boolean;
};

type ProjectPackage = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function printUsage(): void {
  console.log(`Usage: lutest [doctor|install-browsers] [--project <path>] [--base-url <local-url>] [--no-open] [--no-start-app] [--no-install-prompt]\n\nDefaults to the current working directory. Starts a local worker and dashboard, then opens Lutest.`);
}

function parsePort(value: string, flag: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error(`${flag} must be a TCP port`);
  return port;
}

function parseOptions(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { command: "run", openBrowser: true, startApp: true, interactiveBrowserInstall: true };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "doctor" || arg === "install-browsers") {
      if (index !== 0) throw new Error(`${arg} must be the first argument`);
      options.command = arg;
      continue;
    }

    if (projectFlags.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw new Error(`${arg} requires a project path`);
      options.projectPath = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      const value = arg.slice("--project=".length);
      if (!value) throw new Error("--project requires a project path");
      options.projectPath = value;
      continue;
    }

    if (arg === "--base-url") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw new Error("--base-url requires a local URL");
      options.baseUrl = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--base-url=")) {
      const value = arg.slice("--base-url=".length);
      if (!value) throw new Error("--base-url requires a local URL");
      options.baseUrl = value;
      continue;
    }

    if (arg === "--dashboard-port") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw new Error("--dashboard-port requires a port");
      options.dashboardPort = parsePort(value, "--dashboard-port");
      index += 1;
      continue;
    }

    if (arg.startsWith("--dashboard-port=")) {
      options.dashboardPort = parsePort(arg.slice("--dashboard-port=".length), "--dashboard-port");
      continue;
    }

    if (arg === "--no-open") {
      options.openBrowser = false;
      continue;
    }

    if (arg === "--no-start-app") {
      options.startApp = false;
      continue;
    }

    if (arg === "--no-install-prompt") {
      options.interactiveBrowserInstall = false;
      continue;
    }

    if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    if (options.projectPath) throw new Error(`Unexpected extra argument: ${arg}`);
    options.projectPath = arg;
  }

  return options;
}

function resolveProjectRoot(options: CliOptions): string {
  const resolvedProjectPath = path.resolve(options.projectPath ?? process.env.LUTEST_PROJECT_PATH ?? process.cwd());
  const realProjectPath = fs.realpathSync(resolvedProjectPath);
  const projectStats = fs.statSync(realProjectPath);

  if (!projectStats.isDirectory()) throw new Error(`Project path must be a directory: ${resolvedProjectPath}`);
  return realProjectPath;
}

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isLocalBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && ["localhost", "127.0.0.1", "::1"].includes(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function playwrightCliArgs(extra: string[]): { command: string; args: string[] } {
  const isWindows = process.platform === "win32";
  const playwrightBin = path.join(packageRoot, "node_modules", ".bin", isWindows ? "playwright.cmd" : "playwright");
  if (fs.existsSync(playwrightBin)) return { command: playwrightBin, args: extra };
  return { command: "npx", args: ["playwright", ...extra] };
}

function runCommand(command: string, args: string[], cwd: string, env = process.env): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit", shell: process.platform === "win32" });
    child.once("exit", (code) => resolve(code ?? 0));
  });
}

async function checkChromium(): Promise<boolean> {
  try {
    const playwright = requireFromCli("playwright") as typeof import("playwright");
    const browser = await playwright.chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch (error) {
    const message = errorMessage(error);
    console.log(`[Host] Chromium check failed: ${message.split("\n")[0]}`);
    return false;
  }
}

async function runDoctor(projectRoot: string): Promise<void> {
  console.log("=== Lutest Doctor ===");
  console.log(`[Doctor] Project root: ${projectRoot}`);
  console.log(`[Doctor] Chromium: ${(await checkChromium()) ? "ok" : "missing"}`);
  console.log("[Doctor] If Chromium is missing, run: lutest install-browsers");
}

async function installBrowsers(projectRoot: string): Promise<void> {
  console.log("=== Lutest Browser Install ===");
  const command = playwrightCliArgs(["install", "chromium"]);
  const code = await runCommand(command.command, command.args, projectRoot);
  if (code !== 0) throw new Error("Playwright Chromium install failed. On Linux, try: npx playwright install --with-deps chromium");
}

async function askInstallChromium(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.env.CI === "true") return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question("[Host] Chromium is required for runtime scan. Install now? [Y/n] ")).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function ensureChromium(projectRoot: string, options: CliOptions): Promise<void> {
  if (await checkChromium()) return;
  if (options.interactiveBrowserInstall && await askInstallChromium()) {
    await installBrowsers(projectRoot);
    if (await checkChromium()) return;
    throw new Error("Chromium install completed but browser still cannot launch.");
  }
  console.log("[Host] Runtime scan needs Chromium. Run: lutest install-browsers");
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(900), redirect: "manual" });
    return response.status < 500 || response.status === 503;
  } catch {
    return false;
  }
}

async function findRunningBaseUrl(): Promise<string | undefined> {
  for (const port of localRuntimePorts) {
    const url = `http://127.0.0.1:${port}`;
    if (await isReachable(url)) return url;
  }
  return undefined;
}

function getFreePort(preferred?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (preferred) void getFreePort().then(resolve, reject);
      else reject(error);
    });
    server.listen(preferred ?? 0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to resolve a free TCP port"));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function readProjectPackage(projectRoot: string): ProjectPackage | null {
  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  return parsed && typeof parsed === "object" ? parsed as ProjectPackage : null;
}

function hasDependency(pkg: ProjectPackage, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

function packageManager(projectRoot: string): "npm" | "pnpm" | "yarn" {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

function devCommand(projectRoot: string, port: number, pkg: ProjectPackage): { command: string; args: string[] } | null {
  if (!pkg.scripts?.dev) return null;
  const manager = packageManager(projectRoot);
  const base = manager === "yarn" ? ["dev"] : ["run", "dev"];
  const separator = manager === "yarn" ? [] : ["--"];
  if (hasDependency(pkg, "next")) return { command: manager, args: [...base, ...separator, "--hostname", "127.0.0.1", "-p", String(port)] };
  if (hasDependency(pkg, "vite")) return { command: manager, args: [...base, ...separator, "--host", "127.0.0.1", "--port", String(port)] };
  return { command: manager, args: base };
}

function startManagedApp(projectRoot: string, port: number): ChildProcess | null {
  const pkg = readProjectPackage(projectRoot);
  if (!pkg) return null;
  const command = devCommand(projectRoot, port, pkg);
  if (!command) return null;
  console.log(`[Host] Starting project dev server: ${command.command} ${command.args.join(" ")}`);
  return spawn(command.command, command.args, {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", HOSTNAME: "127.0.0.1" },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function resolveRuntimeBaseUrl(options: CliOptions, projectRoot: string): Promise<{ baseUrl: string; appProcess: ChildProcess | null }> {
  const explicit = options.baseUrl ?? process.env.LUTEST_RUNTIME_BASE_URL;
  if (explicit) {
    if (!isLocalBaseUrl(explicit)) throw new Error("Runtime baseUrl must be local http(s) without credentials");
    return { baseUrl: explicit.replace(/\/$/, ""), appProcess: null };
  }

  const running = await findRunningBaseUrl();
  if (running) return { baseUrl: running, appProcess: null };
  if (!options.startApp) throw new Error("No running local app found. Start the app or pass --base-url.");

  const appPort = await getFreePort(3000);
  const appProcess = startManagedApp(projectRoot, appPort);
  if (!appProcess) throw new Error("No safe frontend dev script found. Start the app or pass --base-url.");
  const baseUrl = `http://127.0.0.1:${appPort}`;
  await waitForUrl(baseUrl, 80, 500, "project app");
  return { baseUrl, appProcess };
}

function createWorkerEnvironment(port: number, projectRoot: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    LUTEST_PROJECT_PATH: projectRoot,
    LUTEST_ENV: process.env.LUTEST_ENV ?? "development",
    WORKER_TIMEOUT: process.env.WORKER_TIMEOUT ?? "30000",
  };
}

function resolveWorkerEntrypoint(): string | null {
  try {
    return requireFromCli.resolve("@lutest/worker-node/dist/main.js");
  } catch {
    const repoWorker = path.resolve(packageRoot, "apps/worker-node/dist/main.js");
    return fs.existsSync(repoWorker) ? repoWorker : null;
  }
}

function startWorker(port: number, projectRoot: string): ChildProcess {
  const workerEntrypoint = resolveWorkerEntrypoint();
  const command = workerEntrypoint ? process.execPath : "npm";
  const args = workerEntrypoint ? [workerEntrypoint] : ["run", "dev", "-w", "@lutest/worker-node"];
  const cwd = workerEntrypoint ? projectRoot : packageRoot;
  return spawn(command, args, {
    cwd,
    env: createWorkerEnvironment(port, projectRoot),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function resolveDashboardEntrypoint(): string | null {
  const standaloneServer = path.resolve(packageRoot, "apps/ui/.next/standalone/apps/ui/server.js");
  return fs.existsSync(standaloneServer) ? standaloneServer : null;
}

function startDashboard(port: number, workerUrl: string, runtimeBaseUrl: string, projectRoot: string): ChildProcess {
  const dashboardEntrypoint = resolveDashboardEntrypoint();
  if (dashboardEntrypoint) {
    return spawn(process.execPath, [dashboardEntrypoint], {
      cwd: path.dirname(dashboardEntrypoint),
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        LUTEST_WORKER_URL: workerUrl,
        LUTEST_RUNTIME_BASE_URL: runtimeBaseUrl,
        LUTEST_PROJECT_PATH: projectRoot,
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  }

  return spawn("npm", ["run", "dev", "-w", "ui", "--", "--hostname", "127.0.0.1", "-p", String(port)], {
    cwd: packageRoot,
    env: {
      ...process.env,
      NEXT_PUBLIC_LUTEST_WORKER_URL: workerUrl,
      NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL: runtimeBaseUrl,
      NEXT_PUBLIC_LUTEST_PROJECT_PATH: projectRoot,
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function waitForUrl(url: string, retries: number, delayMs: number, label: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (await isReachable(url)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${label} did not become reachable${lastError ? `: ${errorMessage(lastError)}` : ""}`);
}

async function waitForWorker(port: number, retries = 30, delayMs = 250): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function openBrowser(url: string): void {
  const platform = os.platform();
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore", shell: false });
  child.unref();
}

function logChildExit(name: string, child: ChildProcess): void {
  child.once("exit", (code, signal) => {
    if (signal) console.log(`[Host] ${name} stopped by signal ${signal}`);
    else console.log(`[Host] ${name} exited with code ${code ?? 0}`);
  });
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv);
  const projectRoot = resolveProjectRoot(options);
  dotenv.config({ path: path.resolve(projectRoot, ".env") });

  if (options.command === "doctor") {
    await runDoctor(projectRoot);
    return;
  }

  if (options.command === "install-browsers") {
    await installBrowsers(projectRoot);
    return;
  }

  console.log("=== Lutest CLI Starting ===");
  console.log(`[Host] Project root: ${projectRoot}`);
  await ensureChromium(projectRoot, options);

  const { baseUrl, appProcess } = await resolveRuntimeBaseUrl(options, projectRoot);
  console.log(`[Host] Runtime base URL: ${baseUrl}`);

  const workerPort = await getFreePort();
  const workerUrl = `http://127.0.0.1:${workerPort}`;
  console.log(`[Host] Worker URL: ${workerUrl}`);
  const worker = startWorker(workerPort, projectRoot);
  logChildExit("Worker", worker);

  const status = await waitForWorker(workerPort);
  console.log("[Host] Worker status:", status);

  const dashboardPort = await getFreePort(options.dashboardPort ?? 3000);
  const dashboardUrl = `http://127.0.0.1:${dashboardPort}`;
  const dashboard = startDashboard(dashboardPort, workerUrl, baseUrl, projectRoot);
  logChildExit("Dashboard", dashboard);
  await waitForUrl(dashboardUrl, 80, 500, "dashboard");
  console.log(`[Host] Dashboard: ${dashboardUrl}`);

  if (options.openBrowser) openBrowser(dashboardUrl);

  const children = [worker, dashboard, ...(appProcess ? [appProcess] : [])];
  if (appProcess) logChildExit("Project app", appProcess);
  const cleanup = (): void => {
    console.log("\n[Host] Shutting down...");
    for (const child of children) child.kill("SIGINT");
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
}

main().catch((error) => {
  console.error(`[Host] Startup failed: ${errorMessage(error)}`);
  process.exit(1);
});
