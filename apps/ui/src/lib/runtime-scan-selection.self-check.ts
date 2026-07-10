import assert from "node:assert/strict";
import type { ProductionGraphResponse, RuntimeArtifactDetailResponse, RuntimeScanRequest } from "@lutest/contracts";
import {
  buildRuntimeScanSelectionRequest,
  runtimeScanRouteOptions,
  submitRuntimeScanSelection,
} from "./runtime-scan-selection";

const graph: ProductionGraphResponse = {
  mode: "symbol-level",
  nodes: [
    { id: "page:home", kind: "page", name: "Home", route: { path: "/", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:home-copy", kind: "page", name: "Home copy", route: { path: "/", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:users", kind: "page", name: "Users", route: { path: "/users", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:unsafe", kind: "page", name: "Unsafe", route: { path: "/../secret", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:encoded-unsafe", kind: "page", name: "Encoded unsafe", route: { path: "/%2e%2e/secret", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:artifact", kind: "page", name: "Artifact", route: { path: "/.lutest/runtime", kind: "page" }, confidence: "high", reason: "test" },
    { id: "page:windows-path", kind: "page", name: "Windows path", route: { path: "C:\\secret", kind: "page" }, confidence: "high", reason: "test" },
    { id: "api:users", kind: "api-route", name: "API", route: { path: "/api/users", kind: "api" }, confidence: "high", reason: "test" },
    { id: "file:secret", kind: "file", name: "Secret", filePath: "/home/user/project/secret.ts", confidence: "high", reason: "test" },
  ],
  edges: [],
  summary: { fileCount: 1, pageCount: 7, componentCount: 0, hookCount: 0, apiRouteCount: 1, apiClientMethodCount: 0, externalEndpointCount: 0, edgeCount: 0 },
};

const detail: RuntimeArtifactDetailResponse = {
  scanId: "scan-1",
  status: "passed",
  startedAt: "2026-07-10T00:00:00.000Z",
  finishedAt: "2026-07-10T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  summary: { targetCount: 2, viewportCount: 0, screenshotCount: 0, issueCount: 0, errorCount: 0 },
  targetResults: [
    { scanTargetId: "route:1", kind: "route", route: "/users", status: "passed", viewportResults: [] },
    { scanTargetId: "route:2", kind: "route", route: "/settings", status: "passed", viewportResults: [] },
  ],
};

const options = runtimeScanRouteOptions(graph, detail);
assert.deepEqual(options, [
  { route: "/", source: "production-graph" },
  { route: "/settings", source: "latest-runtime" },
  { route: "/users", source: "production-graph" },
]);
assert(!/\/home\/user|\.lutest|storageState|cookie|token|password/i.test(JSON.stringify(options)), "route options exclude paths and secrets");

const selected = buildRuntimeScanSelectionRequest({
  mode: "selected-routes",
  baseUrl: "http://localhost:3000",
  availableRoutes: options.map((option) => option.route),
  selectedRoutes: ["/users", "/users"],
});
assert.equal(selected.ok, true);
if (selected.ok) assert.deepEqual(selected.request, {
  enabled: true,
  baseUrl: "http://localhost:3000",
  routes: ["/users"],
  targets: undefined,
  discoveryMode: "selected-routes",
  viewportPreset: "default",
  auth: undefined,
});

const allRoutes = buildRuntimeScanSelectionRequest({
  mode: "all-routes",
  baseUrl: "http://127.0.0.1:3000",
  availableRoutes: options.map((option) => option.route),
  selectedRoutes: [],
});
assert.equal(allRoutes.ok, true);
if (allRoutes.ok) assert.deepEqual(allRoutes.request, {
  enabled: true,
  baseUrl: "http://127.0.0.1:3000",
  routes: undefined,
  targets: undefined,
  discoveryMode: "all-routes",
  viewportPreset: "default",
  auth: undefined,
});

let callCount = 0;
let submitted: RuntimeScanRequest | undefined;
const run = (request: RuntimeScanRequest): void => { callCount += 1; submitted = request; };

async function main(): Promise<void> {
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: [] }, run)).ok, false);
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: ["/unknown"] }, run)).ok, false);
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: ["/%2e%2e/secret"] }, run)).ok, false);
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: ["/.lutest/runtime"] }, run)).ok, false);
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: ["C:\\secret"] }, run)).ok, false);
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "https://example.com", availableRoutes: ["/"], selectedRoutes: ["/"] }, run)).ok, false);
  assert.equal(callCount, 0, "invalid selection never calls scan");
  assert.equal((await submitRuntimeScanSelection({ mode: "selected-routes", baseUrl: "http://localhost:3000", availableRoutes: ["/"], selectedRoutes: ["/"] }, run)).ok, true);
  assert.equal(callCount, 1);
  assert.equal(submitted?.discoveryMode, "selected-routes");
  console.log("runtime scan selection self-check passed");
}

void main();
