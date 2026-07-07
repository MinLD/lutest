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
          <main>Runtime scan self-check ${req.url}</main>
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

const assertRejects = async (promise: Promise<unknown>, message: string): Promise<void> => {
  await assert.rejects(promise, (error) => error instanceof Error && error.message.includes(message));
};

const main = async () => {
  const oldLutest = process.env.LUTEST_PROJECT_PATH;
  const oldProject = process.env.PROJECT_PATH;
  const allowedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-allowed-"));
  const projectRoot = path.join(allowedRoot, "project");
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-outside-"));
  await fs.mkdir(projectRoot, { recursive: true });
  process.env.LUTEST_PROJECT_PATH = allowedRoot;
  delete process.env.PROJECT_PATH;

  try {
    const fallback = await discoverRuntimeScanRoutes({ projectRoot, routes: [] });
    assert.deepEqual(fallback.routes, ["/"]);
    assert.equal(fallback.source, "fallback");
    const normalized = await discoverRuntimeScanRoutes({ projectRoot, routes: ["products", "", "/products"] });
    assert.deepEqual(normalized.routes, ["/", "/products"]);
    await assertRejects(discoverRuntimeScanRoutes({ projectRoot, routes: ["https://evil.com"] }), "Runtime scan route must be a local path");

    const server = await startServer();
    try {
      await assertRejects(runPlaywrightRuntimeScan({ projectRoot: outsideRoot, baseUrl: server.baseUrl, routes: ["/"] }), "Project path must stay inside allowed root");
      await assertRejects(runPlaywrightRuntimeScan({ projectRoot, baseUrl: "https://example.com", routes: ["/"] }), "Runtime scan baseUrl must be a local HTTP(S) URL");
      await assertRejects(runPlaywrightRuntimeScan({ projectRoot, baseUrl: "file:///etc/passwd", routes: ["/"] }), "Runtime scan baseUrl must be a local HTTP(S) URL");
      await assertRejects(runPlaywrightRuntimeScan({ projectRoot, baseUrl: "http://user:pass@127.0.0.1", routes: ["/"] }), "Runtime scan baseUrl must be a local HTTP(S) URL");

      const result = await runPlaywrightRuntimeScan({
        projectRoot,
        baseUrl: server.baseUrl,
        routes: ["/", "/foo/bar", "/foo-bar"],
        viewport: { width: 640, height: 480 },
        headless: true,
        timeoutMs: 10_000,
      });

      assert.equal(result.routes.length, 3);
      assert.deepEqual(result.routeDiscovery.routes, ["/", "/foo-bar", "/foo/bar"]);
      assert.equal(result.summary.routeCount, 3);
      assert.equal(result.routes[0]?.status, 200);
      assert(result.routes[0]?.consoleMessages.some((message) => message.text.includes("self-check warning")));
      assert(result.routes[0]?.consoleMessages.some((message) => message.text.includes("self-check error")));
      assert(result.routes[0]?.failedResponses.some((response) => response.status === 404 && response.url.endsWith("/missing.js")));
      assert.equal(result.summary.screenshotCount, 3);
      assert.equal(new Set(result.routes.map((route) => route.screenshotPath)).size, 3);
      assert.equal(await exists(result.routes[0]?.screenshotPath), true);
      assert.equal(await exists(result.artifacts.resultPath), true);
      const artifact = JSON.parse(await fs.readFile(result.artifacts.resultPath, "utf-8")) as { scanId?: string; routeDiscovery?: { routes?: string[] } };
      assert.equal(artifact.scanId, result.scanId);
      assert.deepEqual(artifact.routeDiscovery?.routes, result.routeDiscovery.routes);
    } finally {
      await server.close();
    }

    const closedServer = await startServer();
    const unreachableBaseUrl = closedServer.baseUrl;
    await closedServer.close();
    const failed = await runPlaywrightRuntimeScan({
      projectRoot,
      baseUrl: unreachableBaseUrl,
      routes: ["/"],
      viewport: { width: 640, height: 480 },
      headless: true,
      timeoutMs: 1_000,
    });
    assert.equal(failed.routes.length, 1);
    assert(failed.routes[0]?.error);
    assert.equal(failed.routes[0]?.screenshotPath, undefined);
    assert.equal(failed.summary.screenshotCount, 0);
  } finally {
    if (oldLutest === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = oldLutest;
    if (oldProject === undefined) delete process.env.PROJECT_PATH;
    else process.env.PROJECT_PATH = oldProject;
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

