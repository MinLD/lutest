import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import dotenv from "dotenv";

const rootDir = process.cwd();

dotenv.config({ path: path.resolve(rootDir, ".env") });

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

function createWorkerEnvironment(port: number): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    LUTEST_ENV: process.env.LUTEST_ENV ?? "development",
    WORKER_TIMEOUT: process.env.WORKER_TIMEOUT ?? "30000"
  };
}

function startWorker(port: number): ChildProcess {
  const worker = spawn("npm", ["run", "dev", "-w", "@lutest/worker-node"], {
    cwd: rootDir,
    env: createWorkerEnvironment(port),
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
  console.log("=== Lutest Node Host CLI Starting ===");

  const port = await getFreePort();
  console.log(`[Host] Allocated worker port: ${port}`);

  const worker = startWorker(port);
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
    console.error("[Host] Worker health check failed:", error);
    worker.kill("SIGINT");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[Host] Startup failed:", error);
  process.exit(1);
});