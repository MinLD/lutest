import {
  validateGraphQuery,
  validateLatestReportQuery,
  validateLatestReportResponse,
  validateProjectPathQuery,
  validateRuntimeArtifactMeta,
  validateRuntimeLayoutIssue,
  validateRuntimeScanRequest,
  validateRuntimeScanResult,
  validateScanResponse,
  validateScanRequest,
} from "./index";

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const same = (actual: unknown, expected: unknown, message: string): void => {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
};

same(validateScanRequest({}), {
  ok: true,
  value: { projectPath: undefined },
}, "empty scan request valid");

same(validateScanRequest({ projectPath: "D:\\Projects\\lutest" }), {
  ok: true,
  value: { projectPath: "D:\\Projects\\lutest" },
}, "scan request projectPath valid");

assert(!validateScanRequest(null).ok, "null scan request invalid");
assert(!validateScanRequest({ projectPath: "" }).ok, "empty projectPath invalid");
assert(!validateScanRequest({ projectPath: 123 }).ok, "number projectPath invalid");
assert(
  !validateScanRequest({ projectPath: "x", extra: true }).ok,
  "unknown scan field invalid",
);

const runtimeRequest = {
  enabled: true,
  baseUrl: "http://localhost:3000",
  routes: ["/"],
  targets: [{ id: "home", kind: "route", route: "/", name: "Home" }],
  discoveryMode: "selected-routes",
  viewportPreset: "default",
} as const;

assert(validateRuntimeScanRequest(runtimeRequest).ok, "runtime request local baseUrl valid");
assert(validateScanRequest({ runtimeScan: runtimeRequest }).ok, "scan request runtime opt-in valid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, enabled: false }).ok, "runtime request must opt in");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "https://example.com" }).ok, "external runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "file:///tmp/index.html" }).ok, "file runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "data:text/html,x" }).ok, "data runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "javascript:alert(1)" }).ok, "javascript runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "http://user:pass@localhost:3000" }).ok, "credential runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "x", kind: "unknown", route: "/" }] }).ok, "invalid runtime target kind rejected");
assert(validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#email", valueFromEnv: "LUTEST_EMAIL" }] }] }).ok, "flow target with env fill accepted");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#email" }] }] }).ok, "fill missing value rejected");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "click", selector: "button.delete" }] }] }).ok, "destructive click blocked");
assert(validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "click", selector: "button.delete", allowDestructive: true }] }] }).ok, "destructive click explicit allow accepted");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "waitForTimeout", timeoutMs: 10001 }] }] }).ok, "oversized wait rejected");

const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 };
const viewport = { width: 390, height: 844 };
const layoutIssue = {
  id: "issue-1",
  type: "small-click-target",
  code: "small-click-target",
  severity: "warning",
  message: "Small click target",
  scanTargetId: "home",
  route: "/",
  viewport,
  elementRef: "el-1",
  evidence: { selectorHint: "button", boundingBox: rect, viewport, threshold: "min 44px" },
} as const;
assert(validateRuntimeLayoutIssue(layoutIssue).ok, "layout issue valid");
assert(!validateRuntimeLayoutIssue({ ...layoutIssue, type: "contrast" }).ok, "layout issue invalid type rejected");
assert(!validateRuntimeLayoutIssue({ ...layoutIssue, code: "horizontal-overflow" }).ok, "layout issue code mismatch rejected");

const runtimeResult = {
  scanId: "scan-1",
  status: "passed",
  startedAt: "2026-07-09T00:00:00.000Z",
  finishedAt: "2026-07-09T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  targets: runtimeRequest.targets,
  targetResults: [{
    scanTargetId: "home",
    kind: "route",
    route: "/",
    status: "passed",
    viewportResults: [{
      viewport,
      domGeometry: { viewport, capturedAt: "2026-07-09T00:00:00.500Z", elementCount: 1, truncated: false, elements: [{ internalId: "el-1", tagName: "BUTTON", selectorHint: "button", textSnippet: "Submit", rect, visibility: { display: "block", visibility: "visible", opacity: 1 }, clickable: true, order: 0 }] },
      layoutIssues: [layoutIssue],
      consoleErrors: [], pageErrors: [], networkErrors: [], failedResponses: [], errors: [],
    }],
    errors: [],
  }],
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 1, errorCount: 0 },
  errors: [],
} as const;
assert(validateRuntimeScanResult(runtimeResult).ok, "runtime result with dom/layout valid");

const runtimeMeta = { scanId: "scan-1", savedAt: "2026-07-09T00:00:01.000Z", schemaVersion: "1", artifactVersion: 1, targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 1, errorCount: 0 } as const;
assert(validateRuntimeArtifactMeta(runtimeMeta).ok, "runtime artifact meta valid");
assert(!validateRuntimeArtifactMeta({ ...runtimeMeta, domGeometry: {} }).ok, "runtime artifact meta rejects raw geometry");

const scanResponse = { scanId: "scan-1", startedAt: "2026-07-09T00:00:00.000Z", finishedAt: "2026-07-09T00:00:01.000Z", status: "passed", project: { name: "lutest", rootDir: "/tmp/lutest", lutestDir: "/tmp/lutest/.lutest", packageJsonExists: true, detectedFramework: "unknown" }, sourceFileCount: 0, issues: [], reportPath: "/tmp/lutest/.lutest/report.json" } as const;
assert(validateScanResponse(scanResponse).ok, "scan response without runtime valid");
assert(validateScanResponse({ ...scanResponse, runtimeScan: runtimeResult }).ok, "scan response with runtime valid");
assert(validateLatestReportResponse({ state: "valid", report: scanResponse }).ok, "latest report without runtime valid");
assert(validateLatestReportResponse({ state: "valid", report: scanResponse, runtimeScan: runtimeResult, runtimeArtifactMeta: runtimeMeta }).ok, "latest report with runtime valid");

same(validateProjectPathQuery({}), {
  ok: true,
  value: { path: undefined },
}, "missing path query valid");

same(validateProjectPathQuery({ path: "D:\\Projects\\lutest" }), {
  ok: true,
  value: {
    path: "D:\\Projects\\lutest",
    projectPath: "D:\\Projects\\lutest",
  },
}, "path query valid");

assert(!validateProjectPathQuery({ path: "" }).ok, "empty path query invalid");
assert(
  !validateProjectPathQuery({ path: ["a", "b"] }).ok,
  "array path query invalid",
);
assert(!validateProjectPathQuery({ extra: true }).ok, "unknown query invalid");
same(validateGraphQuery({}), {
  ok: true,
  value: { path: undefined },
}, "graph query valid");
same(validateLatestReportQuery({}), {
  ok: true,
  value: { path: undefined },
}, "latest report query valid");

console.log("validators self-check passed");
