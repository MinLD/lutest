import assert from "node:assert/strict";
import type { LatestReportResponse, RuntimeLayoutIssue, RuntimeScanResult } from "@lutest/contracts";
import { defaultRuntimeFilters, filterRuntimeIssues, runtimeReportViewModel } from "./runtime-report-view-model";

const issue: RuntimeLayoutIssue = {
  id: "issue-1",
  type: "suspicious-overlap",
  severity: "warning",
  message: "button overlaps card",
  scanTargetId: "target-home",
  route: "/home",
  viewport: { width: 390, height: 844 },
  elementRef: "el-1",
  evidence: {
    selectorHint: "button.submit",
    boundingBox: { x: 1, y: 2, width: 3, height: 4, top: 2, right: 4, bottom: 6, left: 1 },
    relatedElementRef: "el-2",
    relatedSelectorHint: ".card",
    relatedBoundingBox: { x: 2, y: 3, width: 4, height: 5, top: 3, right: 6, bottom: 8, left: 2 },
    overlapArea: 12,
    overlapRatio: 0.5,
    viewport: { width: 390, height: 844 },
    screenshotPath: "/home/user/project/.lutest/runtime/secret.png",
    threshold: "overlapRatio > 0.25",
  },
};

const runtimeScan: RuntimeScanResult = {
  scanId: "runtime-1",
  status: "warning",
  startedAt: "2026-07-09T00:00:00.000Z",
  finishedAt: "2026-07-09T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  targets: [{ id: "target-home", kind: "route", route: "/home" }],
  targetResults: [{
    scanTargetId: "target-home",
    kind: "route",
    route: "/home",
    status: "warning",
    viewportResults: [{
      viewport: { width: 390, height: 844 },
      screenshotPath: ".lutest/runtime/safe.png",
      domGeometry: undefined,
      layoutIssues: [issue],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      failedResponses: [],
      errors: [{ code: "ROUTE_SCAN_ERROR", message: "safe message" }],
    }],
    errors: [],
  }],
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 1, issueCount: 1, errorCount: 1 },
  errors: [],
};

const report = { state: "valid", report: { scanId: "scan-1", startedAt: "2026-07-09T00:00:00.000Z", finishedAt: "2026-07-09T00:00:01.000Z", status: "warning", project: { name: "lutest", rootDir: "/tmp/lutest", lutestDir: "/tmp/lutest/.lutest", packageJsonExists: true, detectedFramework: "unknown" }, sourceFileCount: 0, issues: [], reportPath: ".lutest/latest-report.json", runtimeScan } } satisfies LatestReportResponse;

const empty = runtimeReportViewModel(null);
assert.equal(empty.runtimeEnabled, false, "runtime absent empty");

const model = runtimeReportViewModel(report);
assert.equal(model.runtimeEnabled, true, "runtime enabled");
assert.equal(model.issues.length, 1, "issue extracted");
assert.equal(model.issueCountsBySeverity.warning, 1, "severity counted");
assert.equal(model.issues[0]?.relatedSelectorHint, ".card", "overlap evidence preserved");
assert.equal(model.issues[0]?.screenshotRef, undefined, "absolute screenshot path hidden");
assert.equal(model.viewports[0]?.screenshotRef, ".lutest/runtime/safe.png", "safe screenshot ref kept");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, targetId: "target-home" }).length, 1, "target filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, route: "/missing" }).length, 0, "route filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, viewport: "390x844" }).length, 1, "viewport filter works");

const summaryOnly = runtimeReportViewModel({ state: "valid", report: { ...report.report, runtimeScan: null }, runtimeScanSummary: { status: "failed", targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 0, errorCount: 1, issueSummary: { total: 0, bySeverity: {}, byType: {} } } });
assert.equal(summaryOnly.hasFullIssueData, false, "summary only handled");
assert.equal(summaryOnly.status, "failed", "failed status preserved");

const json = JSON.stringify(model);
assert(!/storageState|cookie|token|password|localStorage|sessionStorage/i.test(json), "secrets absent");
console.log("runtime report view model self-check passed");
