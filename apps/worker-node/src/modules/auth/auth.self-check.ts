import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApp } from "../../app";
import { authStatePaths, saveAuthStorageState } from "./auth-state.repository";
import { AuthSessionError, setManualAuthSessionRunnerForTest } from "./auth-session.service";
import { setRuntimeScanRunnerForTest } from "../scan/scan.service";
import type { RuntimeScanResult } from "../runtime-scan/playwright-scan.types";
import { RUNTIME_SCAN_SCHEMA_VERSION } from "../runtime-scan/runtime-scan.schema";

const listen = async () => { const server = http.createServer(createApp()); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)); const addr = server.address(); assert(addr && typeof addr === "object"); return { server, baseUrl: `http://127.0.0.1:${addr.port}` }; };
const requestJson = async (baseUrl: string, route: string, body?: unknown) => { const response = await fetch(`${baseUrl}${route}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, body: await response.json() as Record<string, unknown> }; };
const makeProject = async (root: string) => { await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "auth-check" }), "utf-8"); await fs.mkdir(path.join(root, "src")); await fs.writeFile(path.join(root, "src", "index.ts"), "export const ok = true;", "utf-8"); };
const runtimeResult = (projectRoot: string): RuntimeScanResult => { const now = new Date().toISOString(); return { schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION, scanId: "auth-runtime", generatedAt: now, projectRoot, selectedRoot: projectRoot, baseUrl: "http://localhost:3000", startedAt: now, finishedAt: now, targets: [{ id: "route:1", kind: "route", route: "/" }], routes: [{ targetId: "route:1", target: { id: "route:1", kind: "route", route: "/" }, route: "/", consoleMessages: [], pageErrors: [], networkErrors: [], failedResponses: [], viewportResults: [{ viewport: { width: 390, height: 844 }, layoutIssues: [] }], durationMs: 1 }], limits: { maxRoutes: 20, maxTargets: 20, maxElementsPerViewport: 500, maxTextSnippetLength: 120, routeTimeoutMs: 30000, scanTimeoutMs: 120000, maxInteractionsPerRoute: 8, maxStatesPerRoute: 6, interactionDiscoveryTimeoutMs: 10000, ignoredTags: [] }, errors: [], summary: { routeCount: 1, targetCount: 1, consoleMessageCount: 0, pageErrorCount: 0, networkErrorCount: 0, failedResponseCount: 0, screenshotCount: 0, errorCount: 0 }, artifacts: { rootDir: path.join(projectRoot, ".lutest", "runtime"), screenshotsDir: path.join(projectRoot, ".lutest", "runtime", "screenshots"), resultPath: path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json") }, routeDiscovery: { routes: ["/"], source: "request", reason: "self-check" } }; };

const main = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "lutest-auth-http-")); const allowed = path.join(root, "allowed"); const outside = path.join(root, "outside"); await fs.mkdir(allowed); await fs.mkdir(outside); await makeProject(allowed); await makeProject(outside);
  const prev = process.env.LUTEST_PROJECT_PATH; process.env.LUTEST_PROJECT_PATH = allowed;
  let savedSession = false; let storageStatePath: string | undefined;
  const restoreAuth = setManualAuthSessionRunnerForTest(async ({ projectRoot }) => { savedSession = true; return { status: "saved", authState: await saveAuthStorageState(projectRoot, { cookies: [{ name: "sid", value: "secret-cookie" }], origins: [] }) }; });
  const restoreRuntime = setRuntimeScanRunnerForTest(async (request) => { storageStatePath = request.storageStatePath; return runtimeResult(request.projectRoot); });
  const { server, baseUrl } = await listen();
  try {
    const missing = await requestJson(baseUrl, `/api/auth/status?path=${encodeURIComponent(allowed)}`); assert.equal(missing.status, 200); assert.equal((missing.body as { status: string }).status, "missing");
    const start = await requestJson(baseUrl, "/api/actions/auth/start", { projectPath: allowed, baseUrl: "http://localhost:3000", timeoutMs: 1000 }); assert.equal(start.status, 200, JSON.stringify(start.body)); assert.equal(savedSession, true); assert.equal(JSON.stringify(start.body).includes("secret-cookie"), false);
    const status = await requestJson(baseUrl, `/api/auth/status?path=${encodeURIComponent(allowed)}`); assert.equal(status.status, 200); assert.equal((status.body as { status: string }).status, "valid"); assert.equal(JSON.stringify(status.body).includes("secret-cookie"), false);
    const badBase = await requestJson(baseUrl, "/api/actions/auth/start", { projectPath: allowed, baseUrl: "https://example.com" }); assert.equal(badBase.status, 400); assert.equal((badBase.body.error as { code: string }).code, "BASE_URL_NOT_LOCAL");
    const outsideRes = await requestJson(baseUrl, "/api/actions/auth/start", { projectPath: outside, baseUrl: "http://localhost:3000" }); assert.equal(outsideRes.status, 403);
    const runtimeMissing = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowed, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000", auth: { useSavedState: true } } }); assert.equal(runtimeMissing.status, 200); assert.equal(storageStatePath, authStatePaths(allowed).statePath);
    assert.equal(JSON.stringify(runtimeMissing.body).includes("storage-state"), false);
    const clear = await requestJson(baseUrl, "/api/actions/auth/clear", { projectPath: allowed }); assert.equal(clear.status, 200); assert.equal((clear.body as { status: string }).status, "cleared");
    const missingScan = await requestJson(baseUrl, "/api/actions/scan", { projectPath: allowed, runtimeScan: { enabled: true, baseUrl: "http://localhost:3000", auth: { useSavedState: true } } }); assert.equal(missingScan.status, 400); assert.equal((missingScan.body.error as { code: string }).code, "AUTH_STATE_MISSING");
    const restoreTimeout = setManualAuthSessionRunnerForTest(async () => ({ status: "timeout", error: { code: "AUTH_SESSION_TIMEOUT", message: "timeout" } })); const timeout = await requestJson(baseUrl, "/api/actions/auth/start", { projectPath: allowed, baseUrl: "http://localhost:3000" }); assert.equal(timeout.status, 408); restoreTimeout();
    const restoreFail = setManualAuthSessionRunnerForTest(async () => { throw new AuthSessionError("AUTH_SESSION_START_FAILED", "failed"); }); const failed = await requestJson(baseUrl, "/api/actions/auth/start", { projectPath: allowed, baseUrl: "http://localhost:3000" }); assert.equal(failed.status, 500); assert.equal((failed.body.error as { code: string }).code, "AUTH_SESSION_START_FAILED"); restoreFail();
  } finally { restoreAuth(); restoreRuntime(); await new Promise<void>((resolve) => server.close(() => resolve())); if (prev === undefined) delete process.env.LUTEST_PROJECT_PATH; else process.env.LUTEST_PROJECT_PATH = prev; }
};
void main().then(() => console.log("auth integration self-check passed"));
