import assert from "node:assert/strict";
import type { LatestReportResponse, RuntimeArtifactDetailResponse, RuntimeLayoutIssue, RuntimeScanResult } from "@lutest/contracts";
import { defaultRuntimeFilters, filterRuntimeIssues, groupRuntimeSkippedInteractions, runtimeReportViewModel, safeArtifactRef } from "./runtime-report-view-model";

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
      stateId: "state_filter",
      stateLabel: "after open Filter",
      stateDedupKey: "state_filter",
      interactionSource: { candidateId: "candidate_1", kind: "filter-sort", label: "Filter", action: "click" },
      skippedInteractions: [{ candidateId: "candidate_2", kind: "toggle", label: "Delete", reason: "destructive" }],
      readabilityCoverage: { candidateTextCount: 5, checkedTextCount: 4, skippedTextCount: 1, skippedByReason: { "text-shadow": 1 }, incomplete: true },
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
assert.equal(model.issues[0]?.screenshotRef, undefined, "legacy raw screenshot path is not exposed");
assert.equal(model.issues[0]?.screenshotAvailable, true, "issue screenshot marked available");
assert.equal(model.viewports[0]?.screenshotRef, undefined, "legacy viewport screenshot path is not exposed");
assert.equal(model.screenshotArtifacts.length, 1, "screenshots deduped by target viewport");
assert.equal(model.screenshotArtifacts[0]?.scanTargetId, "target-home", "screenshot target mapped");
assert.equal(model.screenshotArtifacts[0]?.route, "/home", "screenshot route mapped");
assert.equal(model.screenshotArtifacts[0]?.viewportLabel, "390x844", "screenshot viewport mapped");
assert.equal(model.screenshotArtifacts[0]?.safeRef, undefined, "legacy artifact path is not exposed");
assert.equal(model.states[0]?.label, "after open Filter", "runtime state mapped separately from target");
assert.equal(model.skippedInteractions[0]?.reason, "destructive", "typed skipped reason mapped");
assert.equal(model.readabilityCheckedCount, 4, "public runtime readability coverage mapped");
assert.equal(model.readabilitySkippedCount, 1, "public runtime readability skips mapped");
assert.deepEqual(
  groupRuntimeSkippedInteractions([
    { candidateId: "candidate-delete", label: "Delete", kind: "toggle", reason: "destructive", targetId: "target-home", route: "/home", viewportKey: "390x844" },
    { candidateId: "candidate-delete", label: "Delete", kind: "toggle", reason: "destructive", targetId: "target-home", route: "/home", viewportKey: "1440x900" },
    { candidateId: "candidate-save", label: "Save", kind: "toggle", reason: "destructive", targetId: "target-home", route: "/home", viewportKey: "390x844" },
  ]).map(({ candidateId, observationCount, viewportCount }) => ({ candidateId, observationCount, viewportCount })),
  [
    { candidateId: "candidate-delete", observationCount: 2, viewportCount: 2 },
    { candidateId: "candidate-save", observationCount: 1, viewportCount: 1 },
  ],
  "interaction safety audit groups repeated control observations and preserves viewport coverage",
);
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, route: "/home" }).length, 1, "affected route filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, state: "after open Filter" }).length, 1, "state filter works");
assert.equal(filterRuntimeIssues(model.issues, { ...defaultRuntimeFilters, state: "baseline" }).length, 0, "state filter rejects nonmatching state");
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
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 1, issueCount: 2, errorCount: 0 },
  targetResults: [{
    scanTargetId: "target-home",
    kind: "route",
    route: "/home",
    status: "warning",
    viewportResults: [{
      viewport: { width: 390, height: 844 },
      stateId: "state_filter",
      stateLabel: "after open Filter",
      stateDedupKey: "state_filter",
      interactionSource: { candidateId: "candidate_1", kind: "filter-sort", label: "Filter", action: "click" },
      skippedInteractions: [{ candidateId: "candidate_2", kind: "toggle", label: "Delete", reason: "destructive" }],
      readabilityCoverage: { candidateTextCount: 5, checkedTextCount: 4, skippedTextCount: 1, skippedByReason: { "text-shadow": 1 }, incomplete: true },
      screenshot: { available: true, ref: opaqueRef },
      diagnostics: [
        { kind: "console-warning", message: "Fixture warning" },
        { kind: "page-error", message: "Fixture page error" },
      ],
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
      }, {
        id: "issue-legacy-44px-false-positive",
        type: "small-click-target",
        severity: "warning",
        message: "Small click target",
        evidence: {
          scanTargetId: "target-home",
          route: "/home",
          viewport: { width: 390, height: 844 },
          selector: "button.import",
          elementRef: "el-2",
          boundingBox: { x: 20, y: 20, width: 30, height: 30, top: 20, right: 50, bottom: 50, left: 20 },
          screenshot: { available: true, ref: opaqueRef },
          reason: "minimum 44px",
          dedupKey: "issue-legacy-44px-false-positive",
        },
      }],
    }],
  }],
};
const detailModel = runtimeReportViewModel(report, detail);
assert.equal(detailModel.hasFullIssueData, true, "runtime detail supplies full issue data after refresh");
assert.equal(detailModel.issues.length, 1, "legacy 44px warning hidden when target meets WCAG AA 24px size");
assert.equal(detailModel.issues[0]?.screenshotRef, opaqueRef, "runtime detail keeps opaque screenshot ref");
assert.equal(detailModel.issues[0]?.stateLabel, "after open Filter", "detail issue inherits discovered state");
assert.equal(detailModel.states[0]?.interactionLabel, "Filter", "interaction source mapped safely");
assert.equal(detailModel.skippedInteractions[0]?.label, "Delete", "skipped control label mapped safely");
assert.equal(detailModel.diagnosticCount, 2, "browser diagnostic count survives artifact refresh");
assert.equal(detailModel.readabilityCheckedCount, 4, "readability checked count survives artifact refresh");
assert.equal(detailModel.readabilitySkippedCount, 1, "readability skipped count survives artifact refresh");
assert.equal(detailModel.readabilityIncompleteViewportCount, 1, "incomplete readability coverage remains visible");
assert.equal(detailModel.diagnostics[0]?.kind, "console-warning", "typed browser diagnostic mapped");
assert.equal(detailModel.issues[0]?.threshold, "WCAG 2.2 AA: at least 24×24 CSS px, or sufficient spacing from nearby targets.", "visible small target uses current WCAG explanation");
assert(!JSON.stringify(detailModel).includes(".lutest"), "runtime detail view model excludes raw lutest paths");

const contrastDetail: RuntimeArtifactDetailResponse = {
  ...detail,
  summary: { ...detail.summary, issueCount: 1 },
  targetResults: [{
    ...detail.targetResults[0],
    viewportResults: [{
      ...detail.targetResults[0].viewportResults[0],
      issues: [{
        id: "contrast-1",
        type: "low-text-contrast",
        severity: "warning",
        message: "Text and background colors do not meet the WCAG 2.2 AA contrast requirement.",
        evidence: {
          scanTargetId: "target-home",
          route: "/home",
          viewport: { width: 390, height: 844 },
          selector: "p.low-contrast",
          elementRef: "el-contrast",
          boundingBox: { x: 20, y: 20, width: 180, height: 24, top: 20, right: 200, bottom: 44, left: 20 },
          screenshot: { available: true, ref: opaqueRef },
          reason: "4.5:1 minimum contrast for normal text",
          foregroundColor: "#999999",
          backgroundColor: "#ffffff",
          contrastRatio: 2.85,
          requiredContrastRatio: 4.5,
          foregroundOklch: { l: 0.68, c: 0, h: 0 },
          backgroundOklch: { l: 1, c: 0, h: 0 },
          oklchDelta: { lightness: 0.32, chroma: 0, hue: 0 },
          suggestedForegroundColor: "#767676",
          suggestionReason: "Adjust foreground OKLCH lightness while preserving approximate hue/chroma to meet WCAG AA 4.5:1.",
          dedupKey: "contrast-1",
        },
      }],
    }],
  }],
};
const contrastModel = runtimeReportViewModel(report, contrastDetail);
assert.equal(contrastModel.issues[0]?.foregroundOklch?.l, 0.68, "UI view-model preserves foreground OKLCH evidence");
assert.equal(contrastModel.issues[0]?.oklchDelta?.lightness, 0.32, "UI view-model preserves OKLCH delta");
assert.equal(contrastModel.issues[0]?.suggestedForegroundColor, "#767676", "UI view-model preserves suggested foreground");

assert.equal(detailModel.screenshotArtifacts[0]?.stateLabel, "after open Filter", "state screenshot remains selectable without relying on issue geometry");

const missingScreenshot = runtimeReportViewModel({ state: "valid", report: { ...report.report, runtimeScan: { ...runtimeScan, targetResults: [{ ...runtimeScan.targetResults[0], viewportResults: [{ ...runtimeScan.targetResults[0].viewportResults[0], screenshotPath: undefined, layoutIssues: [{ ...issue, evidence: { ...issue.evidence, screenshotPath: undefined } }] }] }] } } });
assert.equal(missingScreenshot.issues[0]?.screenshotAvailable, false, "missing screenshot handled");
assert.equal(missingScreenshot.issues[0]?.screenshotRef, undefined, "missing screenshot has no ref");
assert.equal(missingScreenshot.screenshotArtifacts[0]?.available, false, "missing artifact marked unavailable");

assert.equal(safeArtifactRef(opaqueRef), opaqueRef, "opaque screenshot ref allowed");
assert.equal(safeArtifactRef(".lutest/runtime/safe.png"), undefined, "raw lutest artifact hidden");
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
