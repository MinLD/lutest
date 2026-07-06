import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { runPlaywrightRuntimeScan } from "./playwright-scan.service";
import { discoverRuntimeScanRoutes } from "./playwright-route-discovery";

const startServer = async (): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = http.createServer((req, res) => {
    if (req.url === "/missing.js") {
      res.writeHead(404, { "content-type": "text/javascript" });
      res.end("not found");
      return;
    }

    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html>
      <html>
        <head><title>runtime scan self-check</title></head>
        <body>
          <main>Runtime scan self-check</main>
          <script>
            console.warn("self-check warning");
            console.error("self-check error");
          </script>
          <script src="/missing.js"></script>
        </body>
      </html>`);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

const main = async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-scan-"));
  const fallback = await discoverRuntimeScanRoutes({ projectRoot, routes: [] });
  assert.deepEqual(fallback.routes, ["/"]);
  assert.equal(fallback.source, "fallback");

  const server = await startServer();
  try {
    const result = await runPlaywrightRuntimeScan({
      projectRoot,
      baseUrl: server.baseUrl,
      routes: ["/"],
      viewport: { width: 640, height: 480 },
      headless: true,
      timeoutMs: 10_000,
    });

    assert.equal(result.routes.length, 1);
    assert.equal(result.summary.routeCount, 1);
    assert.equal(result.routes[0]?.route, "/");
    assert.equal(result.routes[0]?.status, 200);
    assert(result.routes[0]?.consoleMessages.some((message) => message.text.includes("self-check warning")));
    assert(result.routes[0]?.consoleMessages.some((message) => message.text.includes("self-check error")));
    assert(result.routes[0]?.failedResponses.some((response) => response.status === 404 && response.url.endsWith("/missing.js")));
    assert.equal(result.summary.screenshotCount, 1);
    assert.equal(result.summary.failedResponseCount >= 1, true);
    assert.equal(result.summary.consoleMessageCount >= 2, true);
    assert.equal(await exists(result.routes[0]?.screenshotPath), true);
    assert.equal(await exists(result.artifacts.resultPath), true);
    const artifact = JSON.parse(await fs.readFile(result.artifacts.resultPath, "utf-8")) as { scanId?: string };
    assert.equal(artifact.scanId, result.scanId);
  } finally {
    await server.close();
  }

  console.log("playwright runtime scan self-check passed");
};

const exists = async (filePath: string | undefined): Promise<boolean> => {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
