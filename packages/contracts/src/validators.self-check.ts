import {
  validateAuthClearResponse,
  validateAuthStartRequest,
  validateAuthStartResponse,
  validateAuthStatusResponse,
  validateGraphQuery,
  validateLatestReportQuery,
  validateLatestReportResponse,
  validateProjectPathQuery,
  validateRuntimeArtifactDetailResponse,
  validateRuntimeArtifactScreenshotQuery,
  validateRuntimeArtifactMeta,
  validateDomGeometry,
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

const routeTarget = { id: "home", kind: "route", route: "/", name: "Home" } as const;
const runtimeRequest = {
  enabled: true,
  baseUrl: "http://localhost:3000",
  routes: ["/"],
  discoveryMode: "selected-routes",
  viewportPreset: "default",
} as const;
const customRuntimeRequest = {
  enabled: true,
  baseUrl: "http://localhost:3000",
  targets: [routeTarget],
  discoveryMode: "custom-targets",
  viewportPreset: "default",
} as const;

assert(validateRuntimeScanRequest(runtimeRequest).ok, "runtime request local baseUrl valid");
assert(validateRuntimeScanRequest({ ...runtimeRequest, interactionDiscovery: { enabled: true, maxInteractionsPerRoute: 8, maxStatesPerRoute: 6, timeoutMs: 10_000 } }).ok, "runtime interaction discovery request valid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, interactionDiscovery: { enabled: true, unknown: true } }).ok, "runtime interaction discovery rejects unknown fields");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, interactionDiscovery: { enabled: true, maxStatesPerRoute: 1 } }).ok, "runtime interaction discovery rejects invalid limits");
assert(validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "all-routes", viewportPreset: "default" }).ok, "runtime all-routes request valid");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "all-routes", routes: ["/"] }).ok, "runtime all-routes rejects explicit routes");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "selected-routes", routes: [] }).ok, "runtime selected-routes requires route");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "selected-routes", routes: ["/../secret"] }).ok, "runtime route traversal rejected");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "selected-routes", routes: ["/%2e%2e/secret"] }).ok, "runtime encoded traversal rejected");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "selected-routes", routes: ["C:\\secret"] }).ok, "runtime absolute filesystem route rejected");
assert(!validateRuntimeScanRequest({ enabled: true, baseUrl: "http://localhost:3000", discoveryMode: "selected-routes", routes: ["/.lutest/runtime"] }).ok, "runtime generated artifact route rejected");
assert(validateScanRequest({ runtimeScan: runtimeRequest }).ok, "scan request runtime opt-in valid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, enabled: false }).ok, "runtime request must opt in");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "https://example.com" }).ok, "external runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "file:///tmp/index.html" }).ok, "file runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "data:text/html,x" }).ok, "data runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "javascript:alert(1)" }).ok, "javascript runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, baseUrl: "http://user:pass@localhost:3000" }).ok, "credential runtime baseUrl invalid");
assert(!validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "x", kind: "unknown", route: "/" }] }).ok, "invalid runtime target kind rejected");
assert(validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#email", valueFromEnv: "LUTEST_EMAIL" }] }] }).ok, "flow target with env fill accepted");
assert(!validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#email" }] }] }).ok, "fill missing value rejected");
assert(!validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "click", selector: "button.delete" }] }] }).ok, "destructive click blocked");
assert(validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "click", selector: "button.delete", allowDestructive: true }] }] }).ok, "destructive click explicit allow accepted");
assert(!validateRuntimeScanRequest({ ...customRuntimeRequest, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "waitForTimeout", timeoutMs: 10001 }] }] }).ok, "oversized wait rejected");

const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 };
const focusRect = { x: 8, y: 8, width: 100, height: 40, top: 8, right: 108, bottom: 48, left: 8 };
const viewport = { width: 390, height: 844 };
assert(validateDomGeometry({
  viewport,
  capturedAt: "2026-07-09T00:00:00.000Z",
  elementCount: 1,
  truncated: false,
  elements: [{
    internalId: "el-skip",
    tagName: "A",
    selectorHint: "a[href='#main']",
    textSnippet: "Skip to content",
    rect: { ...focusRect, y: -46, top: -46, bottom: -6 },
    visibility: { display: "block", visibility: "visible", opacity: 1 },
    focusBehavior: { visibleOnFocus: true, rect: focusRect },
    clickable: true,
    order: 1,
  }],
}).ok, "dom geometry focus behavior valid");
assert(!validateDomGeometry({
  viewport,
  capturedAt: "2026-07-09T00:00:00.000Z",
  elementCount: 1,
  truncated: false,
  elements: [{
    internalId: "el-skip",
    tagName: "A",
    rect,
    visibility: { display: "block", visibility: "visible", opacity: 1 },
    focusBehavior: { visibleOnFocus: true, rawPath: "/home/user/secret" },
    clickable: true,
    order: 1,
  }],
}).ok, "dom geometry focus behavior rejects unknown fields");
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
const contrastIssue = {
  ...layoutIssue,
  id: "contrast-1",
  type: "low-text-contrast",
  code: "low-text-contrast",
  message: "Low text contrast",
  evidence: { ...layoutIssue.evidence, foregroundColor: "#d4d9e0", backgroundColor: "#f8fafc", contrastRatio: 1.36, requiredContrastRatio: 4.5, foregroundOklch: { l: 0.87, c: 0.01, h: 250 }, backgroundOklch: { l: 0.98, c: 0.005, h: 250 }, oklchDelta: { lightness: 0.11, chroma: 0.005, hue: 0 }, suggestedForegroundColor: "#475569", suggestionReason: "Adjust foreground OKLCH lightness while preserving approximate hue/chroma to meet WCAG AA 4.5:1.", threshold: "4.5:1 minimum contrast for normal text" },
} as const;
assert(validateRuntimeLayoutIssue(contrastIssue).ok, "low contrast issue with complete color evidence valid");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, foregroundColor: "/home/user/color" } }).ok, "contrast issue rejects non-color evidence");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, contrastRatio: undefined } }).ok, "contrast issue rejects incomplete evidence");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, contrastRatio: 0.5 } }).ok, "contrast issue rejects ratio below one");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, contrastRatio: 22 } }).ok, "contrast issue rejects ratio above twenty-one");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, requiredContrastRatio: 4 } }).ok, "contrast issue rejects unknown threshold");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, contrastRatio: 4.5 } }).ok, "contrast issue must actually fail its threshold");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, foregroundOklch: { l: 2, c: 0.1, h: 20 } } }).ok, "contrast issue rejects invalid OKLCH lightness");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, backgroundOklch: { l: 0.9, c: -0.1, h: 20 } } }).ok, "contrast issue rejects negative OKLCH chroma");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, oklchDelta: { lightness: 0.1, chroma: 0.1, hue: 361 } } }).ok, "contrast issue rejects invalid OKLCH delta");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, suggestedForegroundColor: "#ffffff" } }).ok, "contrast issue rejects suggested foreground that still fails WCAG");
assert(!validateRuntimeLayoutIssue({ ...contrastIssue, evidence: { ...contrastIssue.evidence, foregroundOklch: { ...contrastIssue.evidence.foregroundOklch, extra: true } } }).ok, "contrast issue rejects unknown OKLCH fields");
assert(!validateRuntimeLayoutIssue({ ...layoutIssue, evidence: { ...layoutIssue.evidence, foregroundColor: "#000000", backgroundColor: "#ffffff", contrastRatio: 2, requiredContrastRatio: 4.5 } }).ok, "non-contrast issue rejects contrast evidence");
assert(!validateRuntimeLayoutIssue({ ...layoutIssue, type: "contrast" }).ok, "layout issue invalid type rejected");
assert(!validateRuntimeLayoutIssue({ ...layoutIssue, code: "horizontal-overflow" }).ok, "layout issue code mismatch rejected");

const runtimeResult = {
  scanId: "scan-1",
  status: "passed",
  startedAt: "2026-07-09T00:00:00.000Z",
  finishedAt: "2026-07-09T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  targets: [routeTarget],
  targetResults: [{
    scanTargetId: "home",
    kind: "route",
    route: "/",
    status: "passed",
    viewportResults: [{
      viewport,
      stateId: "state_0123456789abcdef0123456789abcdef",
      stateLabel: "after open Filter",
      stateDedupKey: "state_0123456789abcdef0123456789abcdef",
      interactionSource: { candidateId: "candidate_1", kind: "filter-sort", label: "Filter", action: "click" },
      skippedInteractions: [{ candidateId: "candidate_2", kind: "toggle", label: "Delete", reason: "destructive" }],
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
assert(!validateRuntimeScanResult({ ...runtimeResult, targetResults: [{ ...runtimeResult.targetResults[0], viewportResults: [{ ...runtimeResult.targetResults[0].viewportResults[0], skippedInteractions: [{ candidateId: "candidate_2", reason: "invented" }] }] }] }).ok, "runtime result rejects invalid skipped reason");
assert(!validateRuntimeScanResult({ ...runtimeResult, targetResults: [{ ...runtimeResult.targetResults[0], viewportResults: [{ ...runtimeResult.targetResults[0].viewportResults[0], unknown: true }] }] }).ok, "runtime result rejects unknown viewport fields");
assert(validateRuntimeScanResult({ ...runtimeResult, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", redacted: true, valueSource: "direct" }] }] }).ok, "runtime result redacted fill target valid");
assert(!validateRuntimeScanResult({ ...runtimeResult, targets: [{ id: "flow", kind: "flow", route: "/", steps: [{ kind: "fill", selector: "#secret", value: "raw-secret" }] }] }).ok, "runtime result raw fill target rejected");

const screenshotRef = "shot_0123456789abcdef0123456789abcdef";
const runtimeDetail = {
  scanId: "scan-1",
  status: "warning",
  startedAt: "2026-07-09T00:00:00.000Z",
  finishedAt: "2026-07-09T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 1, issueCount: 1, errorCount: 0 },
  targetResults: [{
    scanTargetId: "home",
    kind: "route",
    route: "/",
    status: "warning",
    viewportResults: [{
      viewport,
      stateId: "state_0123456789abcdef0123456789abcdef",
      stateLabel: "after open Filter",
      stateDedupKey: "state_0123456789abcdef0123456789abcdef",
      interactionSource: { candidateId: "candidate_1", kind: "filter-sort", label: "Filter", action: "click" },
      skippedInteractions: [{ candidateId: "candidate_2", kind: "toggle", label: "Delete", reason: "destructive" }],
      screenshot: { available: true, ref: screenshotRef },
      diagnostics: [{ kind: "console-warning", message: "Fixture warning" }],
      issues: [{
        id: "issue-1",
        type: "small-click-target",
        severity: "warning",
        message: "Small click target",
        evidence: {
          scanTargetId: "home",
          route: "/",
          viewport,
          selector: "button",
          elementRef: "el-1",
          boundingBox: rect,
          screenshot: { available: true, ref: screenshotRef },
          reason: "minimum 44px",
          dedupKey: "issue-1",
        },
      }],
    }],
  }],
} as const;
assert(validateRuntimeArtifactDetailResponse(runtimeDetail).ok, "runtime artifact detail valid");
const contrastRuntimeDetail = {
  ...runtimeDetail,
  targetResults: [{
    ...runtimeDetail.targetResults[0],
    viewportResults: [{
      ...runtimeDetail.targetResults[0].viewportResults[0],
      issues: [{
        ...runtimeDetail.targetResults[0].viewportResults[0].issues[0],
        id: "contrast-1",
        type: "low-text-contrast",
        message: "Low text contrast",
        evidence: {
          ...runtimeDetail.targetResults[0].viewportResults[0].issues[0].evidence,
          foregroundColor: "#d4d9e0",
          backgroundColor: "#f8fafc",
          contrastRatio: 1.36,
          requiredContrastRatio: 4.5,
          foregroundOklch: { l: 0.87, c: 0.01, h: 250 },
          backgroundOklch: { l: 0.98, c: 0.005, h: 250 },
          oklchDelta: { lightness: 0.11, chroma: 0.005, hue: 0 },
          suggestedForegroundColor: "#475569",
          suggestionReason: "Adjust foreground OKLCH lightness while preserving approximate hue/chroma to meet WCAG AA 4.5:1.",
        },
      }],
    }],
  }],
} as const;
assert(validateRuntimeArtifactDetailResponse(contrastRuntimeDetail).ok, "runtime artifact detail accepts public-safe contrast evidence");
assert(!validateRuntimeArtifactDetailResponse({ ...contrastRuntimeDetail, targetResults: [{ ...contrastRuntimeDetail.targetResults[0], viewportResults: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0], issues: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0], evidence: { ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0].evidence, contrastRatio: 21 } }] }] }] }).ok, "runtime artifact detail rejects non-failing contrast evidence");
assert(!validateRuntimeArtifactDetailResponse({ ...contrastRuntimeDetail, targetResults: [{ ...contrastRuntimeDetail.targetResults[0], viewportResults: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0], issues: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0], evidence: { ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0].evidence, suggestedForegroundColor: "#ffffff" } }] }] }] }).ok, "runtime artifact detail rejects failing suggested foreground");
assert(!validateRuntimeArtifactDetailResponse({ ...contrastRuntimeDetail, targetResults: [{ ...contrastRuntimeDetail.targetResults[0], viewportResults: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0], issues: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0], evidence: { ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0].evidence, foregroundOklch: { l: -1, c: 0, h: 0 } } }] }] }] }).ok, "runtime artifact detail rejects invalid OKLCH evidence");
assert(!validateRuntimeArtifactDetailResponse({ ...contrastRuntimeDetail, targetResults: [{ ...contrastRuntimeDetail.targetResults[0], viewportResults: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0], issues: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0], evidence: { ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0].evidence, foregroundColor: undefined, backgroundColor: undefined, contrastRatio: undefined, requiredContrastRatio: undefined } }] }] }] }).ok, "runtime artifact detail requires low contrast evidence");
assert(!validateRuntimeArtifactDetailResponse({ ...contrastRuntimeDetail, targetResults: [{ ...contrastRuntimeDetail.targetResults[0], viewportResults: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0], issues: [{ ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0], evidence: { ...contrastRuntimeDetail.targetResults[0].viewportResults[0].issues[0].evidence, secretColorPath: "/tmp/color" } }] }] }] }).ok, "runtime artifact detail rejects unknown contrast evidence fields");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], diagnostics: [{ kind: "console-warning", message: "token=secret" }] }] }] }).ok, "runtime artifact detail rejects secret diagnostic text");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], diagnostics: [{ kind: "unknown", message: "invalid" }] }] }] }).ok, "runtime artifact detail rejects invalid diagnostic kind");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], stateId: "/home/user/state" }] }] }).ok, "runtime artifact detail rejects path-like state id");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], skippedInteractions: [{ candidateId: "candidate_2", reason: "unknown" }] }] }] }).ok, "runtime artifact detail rejects invalid skipped reason");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, projectRoot: "/home/user/project" }).ok, "runtime artifact detail rejects internal root");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], screenshot: { available: true, ref: "/home/user/project/screenshot.png" } }] }] }).ok, "runtime artifact detail rejects absolute screenshot ref");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], screenshot: { available: true, ref: "../screenshot.png" } }] }] }).ok, "runtime artifact detail rejects traversal screenshot ref");

const safeGeometry = {
  viewport,
  capturedAt: "2026-07-11T00:00:00.000Z",
  elementCount: 1,
  truncated: false,
  readabilityCoverage: { candidateTextCount: 1, checkedTextCount: 1, skippedTextCount: 0, skippedByReason: {}, incomplete: false },
  elements: [{ internalId: "el-1", tagName: "P", ariaLabel: "Account label", textSnippet: "Readable evidence", rect, visibility: { display: "block", visibility: "visible", opacity: 1 }, textStyle: { foregroundColor: "#111827", backgroundColor: "#ffffff", fontSizePx: 16, fontWeight: 400, largeText: false }, clickable: false, order: 0 }],
} as const;
assert(validateDomGeometry(safeGeometry).ok, "strict readability geometry validates");
assert(!validateDomGeometry({ ...safeGeometry, extra: true }).ok, "dom geometry rejects unknown fields");
assert(!validateDomGeometry({ ...safeGeometry, readabilityCoverage: { ...safeGeometry.readabilityCoverage, skippedTextCount: 1 } }).ok, "readability coverage rejects mismatched counts");
assert(!validateDomGeometry({ ...safeGeometry, elements: [{ ...safeGeometry.elements[0], textSnippet: "Contact user@example.com" }] }).ok, "dom geometry rejects unredacted email evidence");
assert(!validateDomGeometry({ ...safeGeometry, elements: [{ ...safeGeometry.elements[0], ariaLabel: "token=abcdefghijklmnopqrstuvwxyz1234567890" }] }).ok, "dom geometry rejects unredacted token evidence");
assert(validateDomGeometry({ ...safeGeometry, elements: [{ ...safeGeometry.elements[0], textSnippet: "CatalogLayoutInteractionsDiagnosticsReadabilityStaticRules" }] }).ok, "dom geometry accepts long alphabetic navigation text");
assert(!validateDomGeometry({ ...safeGeometry, elements: [{ ...safeGeometry.elements[0], textSnippet: "abcdefghijklmnopqrstuvwxyz1234567890" }] }).ok, "dom geometry rejects opaque token-like text containing digits");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], screenshot: { available: true, ref: ".lutest/runtime/screenshot.png" } }] }] }).ok, "runtime artifact detail rejects raw lutest screenshot ref");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], issues: [{ ...runtimeDetail.targetResults[0].viewportResults[0].issues[0], message: "Error\n at /home/user/app.ts:1" }] }] }] }).ok, "runtime artifact detail rejects raw stack/path");
assert(!validateRuntimeArtifactDetailResponse({ ...runtimeDetail, targetResults: [{ ...runtimeDetail.targetResults[0], viewportResults: [{ ...runtimeDetail.targetResults[0].viewportResults[0], issues: [{ ...runtimeDetail.targetResults[0].viewportResults[0].issues[0], storageState: {} }] }] }] }).ok, "runtime artifact detail rejects secret fields");
assert(validateRuntimeArtifactScreenshotQuery({ ref: screenshotRef }).ok, "runtime screenshot opaque ref query valid");
assert(!validateRuntimeArtifactScreenshotQuery({ ref: "../screenshot.png" }).ok, "runtime screenshot traversal query rejected");
assert(!validateRuntimeArtifactScreenshotQuery({ ref: "/home/user/screenshot.png" }).ok, "runtime screenshot absolute query rejected");
assert(!validateRuntimeArtifactScreenshotQuery({ ref: screenshotRef, unknown: true }).ok, "runtime screenshot unknown query field rejected");

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
assert(validateRuntimeScanRequest({ ...runtimeRequest, auth: { promptOnRedirect: true } }).ok, "runtime guided auth prompt valid");
assert(validateRuntimeScanRequest({ ...runtimeRequest, auth: { useSavedState: true, promptOnRedirect: true } }).ok, "runtime saved auth with guided prompt valid");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, auth: { promptOnRedirect: false } }).ok, "runtime guided auth prompt rejects false");
assert(!validateRuntimeScanRequest({ ...runtimeRequest, auth: {} }).ok, "runtime auth requires explicit opt-in");

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
