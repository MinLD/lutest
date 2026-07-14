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
const projectFlags = new Set(["--project", "--project-path"]);
const DASHBOARD_WAIT_RETRIES = 80;
const DASHBOARD_WAIT_DELAY_MS = 500;
const WORKER_WAIT_RETRIES = 30;
const WORKER_WAIT_DELAY_MS = 250;
const REACHABILITY_TIMEOUT_MS = 900;
const PROJECT_APP_WAIT_RETRIES = 80;
const PROJECT_APP_WAIT_DELAY_MS = 500;
const SHUTDOWN_GRACE_MS = 2500;
const SHUTDOWN_KILL_GRACE_MS = 1000;
const MANAGED_APP_PORT_ATTEMPTS = 4;

type ChromiumStatus = "ok" | "missing";

type CliOptions = {
  command: "run" | "doctor" | "install-browsers";
  projectPath?: string;
  baseUrl?: string;
  dashboardPort?: number;
  openBrowser: boolean;
  startApp: boolean;
  interactiveBrowserInstall: boolean;
  useEnvProjectPath: boolean;
};

type ProjectPackage = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type ManagedCommand = {
  command: string;
  args: string[];
  shellOnWindows?: boolean;
};

type ManagedChild = {
  name: string;
  child: ChildProcess;
};

type RuntimeBaseUrlDecision =
  | { type: "explicit"; baseUrl: string }
  | { type: "managed" };

const managedChildren: ManagedChild[] = [];
let shutdownStarted = false;

function printUsage(): void {
  console.log(`Usage: lutest [doctor|install-browsers] [--project <path>] [--base-url <local-url>] [--no-open] [--no-start-app] [--no-install-prompt] [--use-env-project]\n\nDefaults to the current working directory. Starts a local worker and dashboard, then opens Lutest.`);
}

function parsePort(value: string, flag: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error(`${flag} must be a TCP port`);
  return port;
}

function parseOptions(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { command: "run", openBrowser: true, startApp: true, interactiveBrowserInstall: true, useEnvProjectPath: false };

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

    if (arg === "--use-env-project") {
      options.useEnvProjectPath = true;
      continue;
    }

    if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    if (options.projectPath) throw new Error(`Unexpected extra argument: ${arg}`);
    options.projectPath = arg;
  }

  return options;
}

function resolveProjectRoot(options: CliOptions): string {
  const requestedProjectPath = options.projectPath ?? (options.useEnvProjectPath ? process.env.LUTEST_PROJECT_PATH : undefined) ?? process.cwd();
  const resolvedProjectPath = path.resolve(requestedProjectPath);
  const realProjectPath = fs.realpathSync(resolvedProjectPath);
  const projectStats = fs.statSync(realProjectPath);

  if (!projectStats.isDirectory()) throw new Error(`Project path must be a directory: ${resolvedProjectPath}`);
  return realProjectPath;
}

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

function playwrightCliArgs(extra: string[]): ManagedCommand {
  try {
    const packageJson = requireFromCli.resolve("playwright/package.json");
    const cliEntrypoint = path.join(path.dirname(packageJson), "cli.js");
    if (fs.existsSync(cliEntrypoint)) return { command: process.execPath, args: [cliEntrypoint, ...extra] };
  } catch {
    // Fallback below keeps global/dev installs usable when dependency resolution is unusual.
  }
  return { command: process.platform === "win32" ? "npx.cmd" : "npx", args: ["playwright", ...extra], shellOnWindows: true };
}

function runCommand(command: ManagedCommand, cwd: string, env = process.env): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command.command, command.args, { cwd, env, stdio: "inherit", shell: process.platform === "win32" && command.shellOnWindows === true });
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
  const code = await runCommand(command, projectRoot);
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

async function ensureChromium(projectRoot: string, options: CliOptions): Promise<ChromiumStatus> {
  if (await checkChromium()) return "ok";
  if (options.interactiveBrowserInstall && await askInstallChromium()) {
    await installBrowsers(projectRoot);
    if (await checkChromium()) return "ok";
    throw new Error("Chromium install completed but browser still cannot launch.");
  }
  console.log("[Host] Runtime scan needs Chromium. Run: lutest install-browsers");
  return "missing";
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS), redirect: "manual" });
    return response.status < 500 || response.status === 503;
  } catch {
    return false;
  }
}

async function isHttpResponding(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS), redirect: "manual" });
    return true;
  } catch {
    return false;
  }
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

export async function getManagedAppPort(preferred = 3000): Promise<number> {
  for (let attempt = 0; attempt < MANAGED_APP_PORT_ATTEMPTS; attempt += 1) {
    const port = await getFreePort(attempt === 0 ? preferred : undefined);
    if (!await isHttpResponding(`http://127.0.0.1:${port}`)) return port;
  }
  throw new Error("No unused local HTTP port found for the project app.");
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

function projectPackageEntrypoint(projectRoot: string, packageName: string, relativeEntrypoint: string): string | null {
  const entrypoint = path.join(projectRoot, "node_modules", packageName, relativeEntrypoint);
  return fs.existsSync(entrypoint) ? entrypoint : null;
}

function devCommand(projectRoot: string, port: number, pkg: ProjectPackage): ManagedCommand | null {
  const manager = packageManager(projectRoot);
  const base = manager === "yarn" ? ["dev"] : ["run", "dev"];
  const separator = manager === "yarn" ? [] : ["--"];
  if (pkg.scripts?.dev) {
    if (hasDependency(pkg, "next")) return { command: manager, args: [...base, ...separator, "--hostname", "127.0.0.1", "-p", String(port)], shellOnWindows: true };
    if (hasDependency(pkg, "vite")) return { command: manager, args: [...base, ...separator, "--host", "127.0.0.1", "--port", String(port)], shellOnWindows: true };
    return { command: manager, args: base, shellOnWindows: true };
  }
  if (hasDependency(pkg, "next")) {
    const nextEntrypoint = projectPackageEntrypoint(projectRoot, "next", path.join("dist", "bin", "next"));
    if (nextEntrypoint) return { command: process.execPath, args: [nextEntrypoint, "dev", "--hostname", "127.0.0.1", "-p", String(port)] };
  }
  if (hasDependency(pkg, "vite")) {
    const viteEntrypoint = projectPackageEntrypoint(projectRoot, "vite", path.join("bin", "vite.js"));
    if (viteEntrypoint) return { command: process.execPath, args: [viteEntrypoint, "--host", "127.0.0.1", "--port", String(port)] };
  }
  return null;
}

function createManagedAppEnvironment(projectRoot: string, port: number, workerUrl: string, runtimeBaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    HOSTNAME: "127.0.0.1",
    LUTEST_WORKER_URL: workerUrl,
    LUTEST_RUNTIME_BASE_URL: runtimeBaseUrl,
    LUTEST_PROJECT_PATH: projectRoot,
  };
}

const killedStaleProjectPids = new Set<number>();

function sameRealPath(left: string, right: string): boolean {
  try {
    return fs.realpathSync(left) === fs.realpathSync(right);
  } catch {
    return false;
  }
}

function stopStaleProjectProcess(pid: number, projectRoot: string): void {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid || killedStaleProjectPids.has(pid)) return;
  if (process.platform !== "linux" || !sameRealPath(`/proc/${pid}/cwd`, projectRoot)) return;
  killedStaleProjectPids.add(pid);
  console.log(`[Host] Stopping stale project dev server PID ${pid}`);
  try {
    process.kill(pid, "SIGTERM");
    setTimeout(() => {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }, SHUTDOWN_GRACE_MS).unref();
  } catch {}
}

function pipeManagedAppOutput(child: ChildProcess, projectRoot: string): void {
  let buffer = "";
  const handle = (chunk: Buffer, output: NodeJS.WriteStream): void => {
    const text = chunk.toString();
    output.write(text);
    buffer = `${buffer}${text}`.slice(-2000);
    const pid = Number(buffer.match(/PID:\s*(\d+)/)?.[1]);
    if (pid) stopStaleProjectProcess(pid, projectRoot);
  };
  child.stdout?.on("data", (chunk: Buffer) => handle(chunk, process.stdout));
  child.stderr?.on("data", (chunk: Buffer) => handle(chunk, process.stderr));
}

function startManagedApp(projectRoot: string, port: number, workerUrl: string): ChildProcess | null {
  const pkg = readProjectPackage(projectRoot);
  if (!pkg) return null;
  const command = devCommand(projectRoot, port, pkg);
  if (!command) return null;
  const runtimeBaseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Host] Starting project dev server: ${command.command} ${command.args.join(" ")}`);
  const child = spawn(command.command, command.args, {
    cwd: projectRoot,
    env: createManagedAppEnvironment(projectRoot, port, workerUrl, runtimeBaseUrl),
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32" && command.shellOnWindows === true,
  });
  pipeManagedAppOutput(child, projectRoot);
  return child;
}

async function resolveRuntimeBaseUrl(options: CliOptions, projectRoot: string, workerUrl: string): Promise<{ baseUrl: string; appProcess: ChildProcess | null }> {
  const decision = resolveRuntimeBaseUrlDecision(options);
  if (decision.type === "explicit") return { baseUrl: decision.baseUrl, appProcess: null };

  let commandMissing = false;
  for (let attempt = 0; attempt < MANAGED_APP_PORT_ATTEMPTS; attempt += 1) {
    const appPort = await getManagedAppPort(3000);
    const appProcess = startManagedApp(projectRoot, appPort, workerUrl);
    if (!appProcess) {
      commandMissing = true;
      break;
    }
    registerManagedChild("Project app", appProcess);
    const baseUrl = `http://127.0.0.1:${appPort}`;
    try {
      await waitForProjectApp(baseUrl, appProcess);
      return { baseUrl, appProcess };
    } catch {
      signalChild(appProcess, "SIGTERM");
    }
  }
  if (commandMissing) throw new Error("No safe frontend dev command found. Add a dev script, install frontend dependencies, start the app, or pass --base-url.");
  throw new Error("Project app did not start on an unused local port.");
}

export function resolveRuntimeBaseUrlDecision(options: Pick<CliOptions, "baseUrl" | "startApp">, env: NodeJS.ProcessEnv = process.env): RuntimeBaseUrlDecision {
  const explicit = options.baseUrl ?? env.LUTEST_RUNTIME_BASE_URL;
  if (explicit) {
    if (!isLocalBaseUrl(explicit)) throw new Error("Runtime baseUrl must be local http(s) without credentials");
    return { type: "explicit", baseUrl: explicit.replace(/\/$/, "") };
  }

  if (!options.startApp) throw new Error("No runtime baseUrl provided. Start the app and pass --base-url, or allow Lutest to start it.");
  return { type: "managed" };
}

function createWorkerEnvironment(port: number, projectRoot: string): NodeJS.ProcessEnv {
  const workerUrl = `http://127.0.0.1:${port}`;
  return {
    ...process.env,
    PORT: String(port),
    LUTEST_WORKER_URL: workerUrl,
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
    detached: process.platform !== "win32",
    shell: process.platform === "win32" && !workerEntrypoint,
  });
}

function resolveDashboardEntrypoint(): string | null {
  const standaloneServer = path.resolve(packageRoot, "apps/ui/.next/standalone/apps/ui/server.js");
  return fs.existsSync(standaloneServer) ? standaloneServer : null;
}

function startDashboard(port: number, workerUrl: string, runtimeBaseUrl: string, projectRoot: string, chromiumStatus: ChromiumStatus): ChildProcess {
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
        LUTEST_CHROMIUM_STATUS: chromiumStatus,
      },
      stdio: "inherit",
      detached: process.platform !== "win32",
      shell: false,
    });
  }

  return spawn("npm", ["run", "dev", "-w", "ui", "--", "--hostname", "127.0.0.1", "-p", String(port)], {
    cwd: packageRoot,
    env: {
      ...process.env,
      NEXT_PUBLIC_LUTEST_WORKER_URL: workerUrl,
      NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL: runtimeBaseUrl,
      NEXT_PUBLIC_LUTEST_PROJECT_PATH: projectRoot,
      NEXT_PUBLIC_LUTEST_CHROMIUM_STATUS: chromiumStatus,
    },
    stdio: "inherit",
    detached: process.platform !== "win32",
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

async function waitForProjectApp(url: string, appProcess: ChildProcess): Promise<void> {
  for (let attempt = 1; attempt <= PROJECT_APP_WAIT_RETRIES; attempt += 1) {
    if (childExited(appProcess)) throw new Error("project app exited before opening a local HTTP server");
    if (await isHttpResponding(url)) return;
    await new Promise((resolve) => setTimeout(resolve, PROJECT_APP_WAIT_DELAY_MS));
  }
  throw new Error("project app did not open a local HTTP server");
}

async function waitForWorker(port: number, retries = WORKER_WAIT_RETRIES, delayMs = WORKER_WAIT_DELAY_MS): Promise<unknown> {
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

function startChildReaper(child: ChildProcess): void {
  if (!child.pid || process.platform === "win32") return;
  const script = `
const parent=${process.pid};
const target=${child.pid};
const alive=(pid)=>{try{process.kill(pid,0);return true;}catch{return false;}};
const stop=(signal)=>{try{process.kill(-target,signal);}catch{try{process.kill(target,signal);}catch{}}};
const timer=setInterval(()=>{
  if (alive(parent) && alive(target)) return;
  if (!alive(parent)) { stop('SIGTERM'); setTimeout(()=>stop('SIGKILL'), ${SHUTDOWN_GRACE_MS}); }
  clearInterval(timer);
}, 500);
`;
  const reaper = spawn(process.execPath, ["-e", script], { detached: true, stdio: "ignore" });
  reaper.unref();
}

function registerManagedChild(name: string, child: ChildProcess): void {
  managedChildren.push({ name, child });
  startChildReaper(child);
  logChildExit(name, child);
}

function signalChild(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      try {
        child.kill(signal);
      } catch {
      }
    }
  }
}

function signalManagedChildren(signal: NodeJS.Signals): void {
  for (const { child } of managedChildren) signalChild(child, signal);
}

function childExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForManagedChildren(timeoutMs: number): Promise<boolean> {
  const pending = managedChildren
    .map(({ child }) => child)
    .filter((child) => !childExited(child));
  if (pending.length === 0) return true;

  await Promise.race([
    Promise.all(pending.map((child) => new Promise((resolve) => child.once("exit", resolve)))),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  return managedChildren.every(({ child }) => childExited(child));
}

async function shutdownManagedChildren(reason: string, exitCode: number): Promise<never> {
  if (shutdownStarted) process.exit(exitCode);
  shutdownStarted = true;
  console.log(`\n[Host] Shutting down (${reason})...`);
  signalManagedChildren("SIGINT");
  if (!await waitForManagedChildren(SHUTDOWN_GRACE_MS)) {
    signalManagedChildren("SIGTERM");
    if (!await waitForManagedChildren(SHUTDOWN_GRACE_MS)) {
      signalManagedChildren("SIGKILL");
      await waitForManagedChildren(SHUTDOWN_KILL_GRACE_MS);
    }
  }
  process.exit(exitCode);
}

function installShutdownHooks(): void {
  process.once("SIGINT", () => void shutdownManagedChildren("SIGINT", 0));
  process.once("SIGTERM", () => void shutdownManagedChildren("SIGTERM", 0));
  process.once("SIGHUP", () => void shutdownManagedChildren("SIGHUP", 0));
  process.once("uncaughtException", (error) => {
    console.error(error);
    void shutdownManagedChildren("uncaughtException", 1);
  });
  process.once("unhandledRejection", (error) => {
    console.error(error);
    void shutdownManagedChildren("unhandledRejection", 1);
  });
  process.once("exit", () => {
    if (!shutdownStarted) signalManagedChildren("SIGTERM");
  });
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv);
  if (options.useEnvProjectPath) dotenv.config({ path: path.resolve(process.cwd(), ".env") });
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
  installShutdownHooks();
  const chromiumStatus = await ensureChromium(projectRoot, options);

  const workerPort = await getFreePort();
  const workerUrl = `http://127.0.0.1:${workerPort}`;

  const { baseUrl } = await resolveRuntimeBaseUrl(options, projectRoot, workerUrl);
  console.log(`[Host] Runtime base URL: ${baseUrl}`);

  console.log(`[Host] Worker URL: ${workerUrl}`);
  const worker = startWorker(workerPort, projectRoot);
  registerManagedChild("Worker", worker);

  const status = await waitForWorker(workerPort);
  console.log("[Host] Worker status:", status);

  const dashboardPort = await getFreePort(options.dashboardPort ?? 3000);
  const dashboardUrl = `http://127.0.0.1:${dashboardPort}`;
  const dashboard = startDashboard(dashboardPort, workerUrl, baseUrl, projectRoot, chromiumStatus);
  registerManagedChild("Dashboard", dashboard);
  await waitForUrl(dashboardUrl, DASHBOARD_WAIT_RETRIES, DASHBOARD_WAIT_DELAY_MS, "dashboard");
  console.log(`[Host] Dashboard: ${dashboardUrl}`);

  if (options.openBrowser) openBrowser(dashboardUrl);
  setInterval(() => undefined, 24 * 60 * 60 * 1000);
  await new Promise(() => undefined);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[Host] Startup failed: ${errorMessage(error)}`);
    void shutdownManagedChildren("startup failure", 1);
  });
}
