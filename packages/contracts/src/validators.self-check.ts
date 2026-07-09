import {
  validateAuthClearResponse,
  validateAuthStartRequest,
  validateAuthStartResponse,
  validateAuthStatusResponse,
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
assert(validateRuntimeScanResult({ ...runtimeResult, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", redacted: true, valueSource: "direct" }] }] }).ok, "runtime result redacted fill target valid");
assert(!validateRuntimeScanResult({ ...runtimeResult, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", value: "raw-secret" }] }] }).ok, "runtime result raw fill target rejected");

const runtimeMeta = { scanId: "scan-1", savedAt: "2026-07-09T00:00:01.000Z", schemaVersion: "1", artifactVersion: 1, targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 1, errorCount: 0 } as const;
assert(validateRuntimeArtifactMeta(runtimeMeta).ok, "runtime artifact meta valid");
assert(!validateRuntimeArtifactMeta({ ...runtimeMeta, domGeometry: {} }).ok, "runtime artifact meta rejects raw geometry");

const scanResponse = { scanId: "scan-1", startedAt: "2026-07-09T00:00:00.000Z", finishedAt: "2026-07-09T00:00:01.000Z", status: "passed", project: { name: "lutest", rootDir: "/tmp/lutest", lutestDir: "/tmp/lutest/.lutest", packageJsonExists: true, detectedFramework: "unknown" }, sourceFileCount: 0, issues: [], reportPath: "/tmp/lutest/.lutest/report.json" } as const;
assert(validateScanResponse(scanResponse).ok, "scan response without runtime valid");
assert(validateScanResponse({ ...scanResponse, runtimeScan: runtimeResult }).ok, "scan response with runtime valid");
assert(validateLatestReportResponse({ state: "valid", report: scanResponse }).ok, "latest report without runtime valid");
assert(validateLatestReportResponse({ state: "valid", report: scanResponse, runtimeScan: runtimeResult, runtimeArtifactMeta: runtimeMeta }).ok, "latest report with runtime valid");
const latestRuntimeSummary = {
  status: "warning",
  targetCount: 1,
  viewportCount: 1,
  screenshotCount: 0,
  issueCount: 3,
  errorCount: 0,
  issueSummary: {
    total: 3,
    bySeverity: { error: 1, warning: 2 },
    byType: { "horizontal-overflow": 1, "small-click-target": 2 },
  },
  artifactRef: { kind: "runtime-scan", ref: ".lutest/runtime/latest-runtime-scan.json", label: "Runtime" },
  meta: runtimeMeta,
} as const;
const latestWithSummary = {
  state: "valid",
  generatedAt: "2026-07-09T00:00:01.000Z",
  project: { name: "lutest", selectedRootRef: ".", selectedRootLabel: "lutest" },
  report: scanResponse,
  staticScan: { status: "passed", issueCount: 0, errorCount: 0, warningCount: 0, infoCount: 0, sourceFileCount: 0, reportRef: { kind: "static-report", ref: ".lutest/reports/scan-1.json" } },
  productionGraph: { artifactRef: { kind: "production-graph", ref: ".lutest/graph/latest-production-graph.json" } },
  runtimeScanSummary: latestRuntimeSummary,
  runtimeArtifactMeta: runtimeMeta,
  artifactRefs: [{ kind: "runtime-scan", ref: ".lutest/runtime/latest-runtime-scan.json" }],
} as const;
assert(validateLatestReportResponse({ state: "missing", report: null }).ok, "latest missing valid");
assert(validateLatestReportResponse(latestWithSummary).ok, "latest report summary valid");
assert(!validateLatestReportResponse({ ...latestWithSummary, artifactRefs: [{ kind: "runtime-scan", ref: "/home/user/project/.lutest/runtime/latest-runtime-scan.json" }] }).ok, "absolute artifact ref rejected");
assert(!validateLatestReportResponse({ ...latestWithSummary, project: { selectedRootRef: "/home/user/project" } }).ok, "absolute selectedRootRef rejected");
assert(!validateLatestReportResponse({ ...latestWithSummary, runtimeScanSummary: { ...latestRuntimeSummary, issueCount: 2 } }).ok, "runtime issue count mismatch rejected");
assert(!validateLatestReportResponse({ ...latestWithSummary, runtimeScanSummary: { ...latestRuntimeSummary, rawFillValue: "secret" } }).ok, "unknown dangerous runtime summary field rejected");



const authStart = { baseUrl: "http://localhost:3000", timeoutMs: 10_000, successSelector: "[data-ok]", successUrlIncludes: "/dashboard" };
assert(validateAuthStartRequest(authStart).ok, "auth start local baseUrl valid");
assert(!validateAuthStartRequest({ ...authStart, baseUrl: "https://example.com" }).ok, "auth external baseUrl invalid");
assert(!validateAuthStartRequest({ ...authStart, baseUrl: "file:///tmp/x" }).ok, "auth file baseUrl invalid");
assert(!validateAuthStartRequest({ ...authStart, baseUrl: "data:text/html,x" }).ok, "auth data baseUrl invalid");
assert(!validateAuthStartRequest({ ...authStart, baseUrl: "javascript:alert(1)" }).ok, "auth javascript baseUrl invalid");
assert(!validateAuthStartRequest({ ...authStart, baseUrl: "http://user:pass@localhost:3000" }).ok, "auth credential baseUrl invalid");
assert(!validateAuthStartRequest({ ...authStart, username: "u" }).ok, "auth username rejected");
assert(!validateAuthStartRequest({ ...authStart, password: "p" }).ok, "auth password rejected");
assert(!validateAuthStartRequest({ ...authStart, token: "t" }).ok, "auth token rejected");
assert(!validateAuthStartRequest({ ...authStart, timeoutMs: 999_999 }).ok, "auth timeout too large rejected");
assert(validateAuthStatusResponse({ status: "missing", exists: false, valid: false }).ok, "auth status missing valid");
assert(validateAuthStatusResponse({ status: "valid", exists: true, valid: true, savedAt: "2026-07-09T00:00:00.000Z", storageStateRef: ".lutest/auth/storage-state.json" }).ok, "auth status valid validates");
assert(!validateAuthStatusResponse({ status: "valid", exists: true, valid: true, cookies: [] }).ok, "auth status raw cookies rejected");
assert(!validateAuthStatusResponse({ status: "valid", exists: true, valid: true, storageState: {} }).ok, "auth status raw storage rejected");
assert(validateAuthStartResponse({ status: "saved", authState: { exists: true, valid: true, storageStateRef: ".lutest/auth/storage-state.json" } }).ok, "auth start saved validates");
assert(!validateAuthStartResponse({ status: "saved", cookies: [] }).ok, "auth start raw cookies rejected");
assert(validateAuthClearResponse({ cleared: true, status: "cleared" }).ok, "auth clear validates");
assert(!validateAuthStartResponse({ status: "failed", error: { code: "BAD", message: "bad" } }).ok, "auth invalid error rejected");
assert(validateRuntimeScanRequest({ ...runtimeRequest, auth: { useSavedState: true } }).ok, "runtime auth opt-in valid");

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
