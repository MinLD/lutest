import assert from "node:assert/strict";
import type { LatestReportResponse, RuntimeArtifactDetailResponse, RuntimeLayoutIssue, RuntimeScanResult } from "@lutest/contracts";
import { defaultRuntimeFilters, filterRuntimeIssues, runtimeReportViewModel, safeArtifactRef } from "./runtime-report-view-model";

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
assert.equal(model.issues[0]?.screenshotRef, ".lutest/runtime/safe.png", "issue maps to viewport screenshot safe ref");
assert.equal(model.issues[0]?.screenshotAvailable, true, "issue screenshot marked available");
assert.equal(model.viewports[0]?.screenshotRef, ".lutest/runtime/safe.png", "safe screenshot ref kept");
assert.equal(model.screenshotArtifacts.length, 1, "screenshots deduped by target viewport");
assert.equal(model.screenshotArtifacts[0]?.scanTargetId, "target-home", "screenshot target mapped");
assert.equal(model.screenshotArtifacts[0]?.route, "/home", "screenshot route mapped");
assert.equal(model.screenshotArtifacts[0]?.viewportLabel, "390x844", "screenshot viewport mapped");
assert.equal(model.screenshotArtifacts[0]?.safeRef, ".lutest/runtime/safe.png", "screenshot safe ref kept");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, targetId: "target-home" }).length, 1, "target filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, route: "/missing" }).length, 0, "route filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, viewport: "390x844" }).length, 1, "viewport filter works");

const summaryOnly = runtimeReportViewModel({ state: "valid", report: { ...report.report, runtimeScan: null }, runtimeScanSummary: { status: "failed", targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 0, errorCount: 1, issueSummary: { total: 0, bySeverity: {}, byType: {} } } });
assert.equal(summaryOnly.hasFullIssueData, false, "summary only handled");
assert.equal(summaryOnly.status, "failed", "failed status preserved");

const opaqueRef = "shot_0123456789abcdef0123456789abcdef";
const detail: RuntimeArtifactDetailResponse = {
  scanId: "runtime-1",
  status: "warning",
  startedAt: "2026-07-09T00:00:00.000Z",
  finishedAt: "2026-07-09T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://localhost:3000",
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 1, issueCount: 1, errorCount: 0 },
  targetResults: [{
    scanTargetId: "target-home",
    kind: "route",
    route: "/home",
    status: "warning",
    viewportResults: [{
      viewport: { width: 390, height: 844 },
      screenshot: { available: true, ref: opaqueRef },
      issues: [{
        id: "issue-1",
        type: "small-click-target",
        severity: "warning",
        message: "Small click target",
        evidence: {
          scanTargetId: "target-home",
          route: "/home",
          viewport: { width: 390, height: 844 },
          selector: "button",
          elementRef: "el-1",
          boundingBox: issue.evidence.boundingBox,
          screenshot: { available: true, ref: opaqueRef },
          reason: "minimum 44px",
          dedupKey: "issue-1",
        },
      }],
    }],
  }],
};
const detailModel = runtimeReportViewModel(report, detail);
assert.equal(detailModel.hasFullIssueData, true, "runtime detail supplies full issue data after refresh");
assert.equal(detailModel.issues[0]?.screenshotRef, opaqueRef, "runtime detail keeps opaque screenshot ref");
assert(!JSON.stringify(detailModel).includes(".lutest"), "runtime detail view model excludes raw lutest paths");

const missingScreenshot = runtimeReportViewModel({ state: "valid", report: { ...report.report, runtimeScan: { ...runtimeScan, targetResults: [{ ...runtimeScan.targetResults[0], viewportResults: [{ ...runtimeScan.targetResults[0].viewportResults[0], screenshotPath: undefined, layoutIssues: [{ ...issue, evidence: { ...issue.evidence, screenshotPath: undefined } }] }] }] } } });
assert.equal(missingScreenshot.issues[0]?.screenshotAvailable, false, "missing screenshot handled");
assert.equal(missingScreenshot.issues[0]?.screenshotRef, undefined, "missing screenshot has no ref");
assert.equal(missingScreenshot.screenshotArtifacts[0]?.available, false, "missing artifact marked unavailable");

assert.equal(safeArtifactRef(".lutest/runtime/safe.png"), ".lutest/runtime/safe.png", "safe relative artifact allowed");
assert.equal(safeArtifactRef("/home/user/project/.lutest/runtime/secret.png"), undefined, "absolute unix path hidden");
assert.equal(safeArtifactRef("C:\\Users\\me\\secret.png"), undefined, "absolute windows path hidden");
assert.equal(safeArtifactRef("../secret.png"), undefined, "path traversal hidden");
assert.equal(safeArtifactRef("file:///secret.png"), undefined, "file url hidden");
assert.equal(safeArtifactRef("data:image/png;base64,secret"), undefined, "data url hidden");
assert.equal(safeArtifactRef("javascript:alert(1)"), undefined, "javascript url hidden");
assert.equal(safeArtifactRef("http://example.com/secret.png"), undefined, "external url hidden");

const json = JSON.stringify(model);
assert(!/\/home\/user|C:\\Users|storageState|cookie|token|password|localStorage|sessionStorage/i.test(json), "secrets and raw paths absent");
console.log("runtime report view model self-check passed");
