import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApp } from "../../app";
import { createPlaywrightBrowserMissingError, PlaywrightBrowserPreflightError } from "../runtime-scan/playwright-browser-preflight";
import { runtimeScanArtifactPaths, saveLatestRuntimeScan } from "../runtime-scan/runtime-scan-artifacts";
import { RuntimeScanArtifactError } from "../runtime-scan/runtime-scan-artifacts";
import { RUNTIME_SCAN_SCHEMA_VERSION, type RuntimeScanResult } from "../runtime-scan/runtime-scan.schema";
import { setRuntimeScanRunnerForTest } from "./scan.service";

const listen = async () => {
  const server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const requestJson = async (baseUrl: string, route: string, body?: unknown) => {
  const response = await fetch(`${baseUrl}${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json() as Record<string, unknown>;
  return { status: response.status, body: json };
};

const makeProject = async (root: string) => {
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "runtime-integration-check", dependencies: {} }), "utf-8");
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(path.join(root, "src", "index.ts"), "export const ok = true;\n", "utf-8");
};

const makeRuntimeResult = (projectRoot: string, input: { error?: boolean; rawFill?: string } = {}): RuntimeScanResult => {
  const scanId = `runtime_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const generatedAt = new Date().toISOString();
  const artifactPaths = runtimeScanArtifactPaths({ projectRoot, scanId });
  return {
    schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
    scanId,
    generatedAt,
    projectRoot,
    selectedRoot: projectRoot,
    baseUrl: "http://localhost:3000",
    startedAt: generatedAt,
    finishedAt: generatedAt,
    targets: [{ id: "flow", kind: "flow", name: "Flow", route: "/", steps: [{ kind: "fill", selector: "#secret", valueFromEnv: "LUTEST_SECRET" }] }],
    routes: [{
      targetId: "flow",
      target: { id: "flow", kind: "flow", name: "Flow", route: "/", steps: [{ kind: "fill", selector: "#secret", valueFromEnv: "LUTEST_SECRET" }] },
      route: "/",
      url: "http://localhost:3000/",
      error: input.error ? { code: "ROUTE_LOAD_FAILED", message: "Route failed", targetId: "flow", route: "/" } : undefined,
      consoleMessages: [],
      pageErrors: [],
      networkErrors: [],
      failedResponses: [],
      viewportResults: [{ viewport: { width: 390, height: 844 }, layoutIssues: [] }],
      executionSteps: [{ kind: "fill", selector: "#secret", status: "passed", durationMs: 1, redacted: true, valueSource: "env", valueFromEnv: "LUTEST_SECRET" }],
      durationMs: 1,
    }],
    limits: { maxRoutes: 20, maxTargets: 20, maxElementsPerViewport: 500, maxTextSnippetLength: 120, maxScreenshots: 60, routeTimeoutMs: 30_000, scanTimeoutMs: 120_000, ignoredTags: ["SCRIPT", "STYLE"] },
    errors: input.error ? [{ code: "ROUTE_LOAD_FAILED", message: "Route failed", targetId: "flow", route: "/" }] : [],
    summary: { routeCount: 1, targetCount: 1, consoleMessageCount: 0, pageErrorCount: 0, networkErrorCount: 0, failedResponseCount: 0, screenshotCount: 0, errorCount: input.error ? 1 : 0 },
    artifacts: { rootDir: artifactPaths.rootDir, screenshotsDir: artifactPaths.screenshotsDir, resultPath: artifactPaths.latestResultPath },
    targetDiscovery: { mode: "custom-targets", targetIds: ["flow"], reason: "self-check" },
    routeDiscovery: { routes: ["/"], source: "request", mode: "custom-targets", reason: "self-check" },
  };
};

const main = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "lutest-r72-"));
  const allowedRoot = path.join(root, "allowed");
  const outsideRoot = path.join(root, "outside");
  await fs.mkdir(allowedRoot, { recursive: true });
  await fs.mkdir(outsideRoot, { recursive: true });
  await makeProject(allowedRoot);
  await makeProject(outsideRoot);

  const previousEnv = process.env.LUTEST_PROJECT_PATH;
  process.env.LUTEST_PROJECT_PATH = allowedRoot;
  let calls = 0;
  const restoreRunner = setRuntimeScanRunnerForTest(async (request) => {
    calls += 1;
    const result = makeRuntimeResult(request.projectRoot);
    await saveLatestRuntimeScan(result);
    return result;
  });

  const { server, baseUrl } = await listen();
  try {
    const staticOnly = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot });
    assert.equal(staticOnly.status, 200);
    assert.equal(calls, 0, "static-only must not call runtime runner");
    assert.equal(JSON.stringify(staticOnly.body).includes("runtimeScan"), false);
    await assert.rejects(fs.access(runtimeScanArtifactPaths({ projectRoot: allowedRoot, scanId: "static_check" }).latestResultPath), /ENOENT/);

    const invalid = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000", targets: [{ id: "bad", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#x" }] }] } });
    assert.equal(invalid.status, 400);
    assert.equal((invalid.body.error as { code: string }).code, "CONFIG_ERROR");

    const external = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "https://example.com" } });
    assert.equal(external.status, 400);
    assert.equal((external.body.error as { code: string }).code, "BASE_URL_NOT_LOCAL");
    assert.equal(calls, 0, "invalid baseUrl must fail before runtime runner");

    const storageState = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000", storageState: "x" } });
    assert.equal(storageState.status, 400);
    assert.equal((storageState.body.error as { code: string }).code, "CONFIG_ERROR");

    const runtime = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000", targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", value: "raw-secret" }] }] } });
    assert.equal(runtime.status, 200);
    assert.equal(calls, 1);
    assert.ok(JSON.stringify(runtime.body).includes("runtimeScan"));
    assert.equal(JSON.stringify(runtime.body).includes("raw-secret"), false);

    const latest = await requestJson(baseUrl, `/api/report/latest?path=${encodeURIComponent(allowedRoot)}`);
    assert.equal(latest.status, 200);
    assert.ok(JSON.stringify(latest.body).includes("runtimeScan"), "latest report read-back must contain runtimeScan");
    assert.equal(JSON.stringify(latest.body).includes("raw-secret"), false);

    const artifact = runtimeScanArtifactPaths({ projectRoot: allowedRoot, scanId: "unused" });
    await fs.access(artifact.latestResultPath);

    restoreRunner();
    const restoreMissing = setRuntimeScanRunnerForTest(async () => {
      const missing = createPlaywrightBrowserMissingError();
      if (missing.ok) throw new Error("invalid missing-browser fixture");
      throw new PlaywrightBrowserPreflightError(missing);
    });
    const missing = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000" } });
    assert.equal(missing.status, 400);
    assert.equal((missing.body.error as { code: string }).code, "PLAYWRIGHT_BROWSER_MISSING");
    restoreMissing();

    const restoreRouteError = setRuntimeScanRunnerForTest(async (request) => {
      const result = makeRuntimeResult(request.projectRoot, { error: true });
      await saveLatestRuntimeScan(result);
      return result;
    });
    const routeError = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000" } });
    assert.equal(routeError.status, 200, `per-target route error should not fail whole scan: ${JSON.stringify(routeError.body)}`);
    assert.ok(JSON.stringify(routeError.body).includes("ROUTE_SCAN_ERROR"));
    restoreRouteError();

    const restoreArtifactError = setRuntimeScanRunnerForTest(async () => {
      throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_IO", "write failed");
    });
    const artifactError = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowedRoot, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000" } });
    assert.equal(artifactError.status, 500);
    assert.equal((artifactError.body.error as { code: string }).code, "ARTIFACT_WRITE_ERROR");
    restoreArtifactError();

    const outside = await requestJson(baseUrl, "/api/actions/scan", { projectPath: outsideRoot });
    assert.equal(outside.status, 403);
    assert.equal((outside.body.error as { code: string }).code, "PATH_NOT_ALLOWED");
  } finally {
    restoreRunner();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousEnv === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = previousEnv;
  }
};

void main().then(() => console.log("scan runtime integration self-check passed"));
