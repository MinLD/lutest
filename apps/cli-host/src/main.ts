#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import dotenv from "dotenv";

const cliDir = __dirname;
const packageRoot = path.resolve(cliDir, "../../..");
const requireFromCli = createRequire(__filename);

const projectFlags = new Set(["--project", "--project-path"]);

function printUsage(): void {
  console.log(`Usage: lutest [--project <path>]\n\nDefaults to the current working directory. Also reads LUTEST_PROJECT_PATH from the current project's .env file.`);
}

function parseProjectRoot(argv: string[]): string {
  const args = argv.slice(2);
  let projectPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (projectFlags.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`${arg} requires a project path`);
      }
      projectPath = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      const value = arg.slice("--project=".length);
      if (!value) throw new Error("--project requires a project path");
      projectPath = value;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (projectPath) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }

    projectPath = arg;
  }

  const resolvedProjectPath = path.resolve(projectPath ?? process.env.LUTEST_PROJECT_PATH ?? process.cwd());
  const realProjectPath = fs.realpathSync(resolvedProjectPath);
  const projectStats = fs.statSync(realProjectPath);

  if (!projectStats.isDirectory()) {
    throw new Error(`Project path must be a directory: ${resolvedProjectPath}`);
  }

  return realProjectPath;
}

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, () => {
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

function createWorkerEnvironment(port: number, projectRoot: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    LUTEST_PROJECT_PATH: projectRoot,
    LUTEST_ENV: process.env.LUTEST_ENV ?? "development",
    WORKER_TIMEOUT: process.env.WORKER_TIMEOUT ?? "30000"
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

  const worker = spawn(command, args, {
    cwd,
    env: createWorkerEnvironment(port, projectRoot),
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  worker.once("exit", (code, signal) => {
    if (signal) {
      console.log(`[Host] Worker stopped by signal ${signal}`);
      return;
    }

    console.log(`[Host] Worker exited with code ${code ?? 0}`);
  });

  return worker;
}

async function waitForWorker(port: number, retries = 20, delayMs = 250): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/api/status`);

      if (!response.ok) {
        throw new Error(`Worker returned HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  const projectRoot = parseProjectRoot(process.argv);
  dotenv.config({ path: path.resolve(projectRoot, ".env") });

  console.log("=== Lutest Node Host CLI Starting ===");
  console.log(`[Host] Project root: ${projectRoot}`);

  const port = await getFreePort();
  console.log(`[Host] Allocated worker port: ${port}`);

  const worker = startWorker(port, projectRoot);
  console.log(`[Host] Started Node worker with PID: ${worker.pid ?? "unknown"}`);

  const cleanup = (): void => {
    console.log("\n[Host] Shutting down worker...");
    worker.kill("SIGINT");
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  try {
    const status = await waitForWorker(port);
    console.log("[Host] Worker status:", status);
  } catch (error) {
    console.error(`[Host] Worker health check failed: ${errorMessage(error)}`);
    worker.kill("SIGINT");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[Host] Startup failed: ${errorMessage(error)}`);
  process.exit(1);
});
