import assert from "node:assert/strict";
import {
  RuntimePublicContractAdapterError,
  mapInternalRuntimeScanResult,
  mapPublicRuntimeScanRequest,
  mapRuntimeIntegrationErrorCode,
} from "./runtime-public-contract-adapter";
import { RUNTIME_SCAN_SCHEMA_VERSION, type RuntimeScanResult } from "./runtime-scan.schema";

const now = "2026-07-09T00:00:00.000Z";
const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 };
const viewport = { width: 390, height: 844 };

const baseResult = (): RuntimeScanResult => ({
  schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
  scanId: "runtime_adapter_check",
  generatedAt: now,
  projectRoot: "/tmp/project",
  selectedRoot: "/tmp/project",
  baseUrl: "http://localhost:3000",
  startedAt: now,
  finishedAt: now,
  targets: [{ id: "flow", kind: "flow", name: "Flow", route: "/", steps: [{ kind: "fill", selector: "#secret", value: "raw-secret" }] }],
  routes: [{
    targetId: "flow",
    target: { id: "flow", kind: "flow", name: "Flow", route: "/", steps: [{ kind: "fill", selector: "#secret", valueFromEnv: "LUTEST_SECRET" }] },
    route: "/",
    consoleMessages: [],
    pageErrors: [],
    networkErrors: [],
    failedResponses: [],
    viewportResults: [
      { viewport, layoutIssues: [], consoleMessages: [{ type: "error", text: "mobile-only", location: "a:1:1" }], pageErrors: ["mobile-page"], networkErrors: [], failedResponses: [] },
      { viewport: { width: 768, height: 1024 }, layoutIssues: [{ id: "issue-1", type: "small-click-target", code: "small-click-target", severity: "warning", message: "Small", scanTargetId: "flow", route: "/", viewport: { width: 768, height: 1024 }, elementRef: "el-1", evidence: { boundingBox: rect, viewport: { width: 768, height: 1024 }, threshold: "min 44px" } }], consoleMessages: [{ type: "error", text: "tablet-only" }], pageErrors: [], networkErrors: [{ url: "http://localhost:3000/api", method: "GET", failureText: "tablet-network" }], failedResponses: [] },
      { viewport: { width: 1440, height: 900 }, layoutIssues: [], error: { code: "ROUTE_LOAD_FAILED", message: "desktop route failed", targetId: "flow", route: "/" }, consoleMessages: [], pageErrors: [], networkErrors: [], failedResponses: [{ url: "http://localhost:3000/500", status: 500, statusText: "Server Error" }] },
    ],
    executionSteps: [{ kind: "fill", selector: "#secret", status: "failed", durationMs: 1, redacted: true, valueSource: "direct", code: "MANUAL_FLOW_STEP_FAILED", message: "fill failed" }],
    durationMs: 1,
  }],
  limits: { maxRoutes: 20, maxTargets: 20, maxElementsPerViewport: 500, maxTextSnippetLength: 120, maxScreenshots: 60, routeTimeoutMs: 30_000, scanTimeoutMs: 120_000, ignoredTags: ["SCRIPT", "STYLE"] },
  errors: [],
  summary: { routeCount: 1, targetCount: 1, consoleMessageCount: 2, pageErrorCount: 1, networkErrorCount: 1, failedResponseCount: 1, screenshotCount: 0, errorCount: 0 },
  artifacts: { rootDir: "/tmp/project/.lutest/runtime", screenshotsDir: "/tmp/project/.lutest/runtime/screenshots/runtime_adapter_check", resultPath: "/tmp/project/.lutest/runtime/latest-runtime-scan.json" },
  targetDiscovery: { mode: "custom-targets", targetIds: ["flow"], reason: "self-check" },
  routeDiscovery: { routes: ["/"], source: "request", mode: "custom-targets", reason: "self-check" },
});

const publicRequest = { enabled: true, baseUrl: "http://localhost:3000", routes: ["/a"], targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", value: "raw-secret" }] }], discoveryMode: "custom-targets", viewportPreset: "default" } satisfies import("@lutest/contracts").RuntimeScanRequest;
const publicRequestBefore = JSON.stringify(publicRequest);
const internalRequest = mapPublicRuntimeScanRequest({ projectRoot: "/tmp/project", request: publicRequest });
assert.equal(internalRequest.discoveryMode, "custom-targets");
assert.equal(internalRequest.viewportPreset, "default");
assert.equal(internalRequest.targets?.length, 1);
assert.equal(JSON.stringify(publicRequest), publicRequestBefore, "public request must not mutate");
assert.equal(mapPublicRuntimeScanRequest({ projectRoot: "/tmp/project", request: { ...publicRequest, discoveryMode: "all-routes" } }).targets, undefined);

const mapped = mapInternalRuntimeScanResult(baseResult());
assert.deepEqual(mapped.targetResults[0]?.viewportResults[0]?.consoleErrors, ["mobile-only"]);
assert.deepEqual(mapped.targetResults[0]?.viewportResults[1]?.consoleErrors, ["tablet-only"]);
assert.deepEqual(mapped.targetResults[0]?.viewportResults[2]?.consoleErrors, []);
assert.equal(mapped.targetResults[0]?.status, "failed");
assert.equal(mapped.status, "failed");
assert.equal(mapped.summary.errorCount, 2);
assert.equal(JSON.stringify(mapped).includes("raw-secret"), false);
assert.equal(JSON.stringify(mapped).includes('"value"'), false);
assert.equal(JSON.stringify(mapped).includes('"redacted":true'), true);
assert.equal(mapped.targetResults[0]?.viewportResults[2]?.errors[0]?.code, "ROUTE_SCAN_ERROR");
assert.equal(mapped.targetResults[0]?.executionSteps?.[0]?.code, "TARGET_EXECUTION_ERROR");

assert.equal(mapRuntimeIntegrationErrorCode("RUNTIME_BASE_URL_NOT_ALLOWED"), "BASE_URL_NOT_LOCAL");
assert.equal(mapRuntimeIntegrationErrorCode("PATH_NOT_ALLOWED"), "PATH_NOT_ALLOWED");
assert.equal(mapRuntimeIntegrationErrorCode("MANUAL_FLOW_STEP_FAILED"), "TARGET_EXECUTION_ERROR");
assert.equal(mapRuntimeIntegrationErrorCode("ROUTE_LOAD_FAILED"), "ROUTE_SCAN_ERROR");
assert.equal(mapRuntimeIntegrationErrorCode("RUNTIME_SCAN_ARTIFACT_IO"), "ARTIFACT_WRITE_ERROR");
assert.equal(mapRuntimeIntegrationErrorCode("UNKNOWN"), "RUNTIME_SCAN_FAILED");

const invalid = baseResult();
invalid.baseUrl = "https://example.com";
assert.throws(() => mapInternalRuntimeScanResult(invalid), RuntimePublicContractAdapterError);

console.log("runtime public contract adapter self-check passed");
