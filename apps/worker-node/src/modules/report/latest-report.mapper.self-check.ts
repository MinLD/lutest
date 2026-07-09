import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { RuntimeScanResult, ScanResponse } from "@lutest/contracts";
import { validateLatestReportResponse } from "@lutest/contracts";
import { productionGraphArtifactPaths } from "../graph/production/production-graph-artifacts";
import { runtimeScanArtifactPaths } from "../runtime-scan/runtime-scan-artifacts";
import { mapLatestReportResponse } from "./latest-report.mapper";

const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 };
const viewport = { width: 390, height: 844 };
const now = "2026-07-09T00:00:00.000Z";

const runtimeScan = (): RuntimeScanResult => ({
  scanId: "runtime-1",
  status: "warning",
  startedAt: now,
  finishedAt: now,
  durationMs: 1,
  baseUrl: "http://localhost:3000",
  targets: [{ id: "route-1", kind: "route", route: "/" }],
  targetResults: [{
    scanTargetId: "route-1",
    kind: "route",
    route: "/",
    status: "warning",
    viewportResults: [{
      viewport,
      layoutIssues: [
        { id: "issue-1", type: "horizontal-overflow", code: "horizontal-overflow", severity: "error", message: "Overflow", scanTargetId: "route-1", route: "/", viewport, elementRef: "el-1", evidence: { boundingBox: rect, viewport, threshold: "right <= viewport" } },
        { id: "issue-2", type: "small-click-target", code: "small-click-target", severity: "warning", message: "Small", scanTargetId: "route-1", route: "/", viewport, elementRef: "el-2", evidence: { boundingBox: rect, viewport, threshold: "min 44px" } },
        { id: "issue-3", type: "small-click-target", code: "small-click-target", severity: "warning", message: "Small", scanTargetId: "route-1", route: "/", viewport, elementRef: "el-3", evidence: { boundingBox: rect, viewport, threshold: "min 44px" } },
      ],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      failedResponses: [],
      errors: [],
    }],
    errors: [],
  }],
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 3, errorCount: 0 },
  errors: [],
});

const report = (projectRoot: string, withRuntime: boolean): ScanResponse => ({
  scanId: withRuntime ? "scan-runtime" : "scan-static",
  startedAt: now,
  finishedAt: now,
  status: "warning",
  project: { name: "sample", rootDir: projectRoot, lutestDir: path.join(projectRoot, ".lutest"), packageJsonExists: true, detectedFramework: "unknown" },
  sourceFileCount: 2,
  issues: [{ id: "static-1", type: "todo", severity: "warning", message: "TODO" }],
  reportPath: path.join(projectRoot, ".lutest", "reports", withRuntime ? "scan-runtime.json" : "scan-static.json"),
  runtimeScan: withRuntime ? runtimeScan() : undefined,
});

const main = async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "lutest-r73-mapper-"));
  const reportsDir = path.join(projectRoot, ".lutest", "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, "scan-static.json"), "{}", "utf-8");
  await fs.writeFile(path.join(reportsDir, "scan-runtime.json"), "{}", "utf-8");
  const graphPaths = productionGraphArtifactPaths(projectRoot);
  await fs.mkdir(path.dirname(graphPaths.latestGraphPath), { recursive: true });
  await fs.writeFile(graphPaths.latestGraphPath, "{}", "utf-8");
  const runtimePaths = runtimeScanArtifactPaths({ projectRoot, scanId: "runtime-1" });
  await fs.mkdir(path.dirname(runtimePaths.latestResultPath), { recursive: true });
  await fs.writeFile(runtimePaths.latestResultPath, "{}", "utf-8");
  await fs.writeFile(runtimePaths.metaPath, "{}", "utf-8");

  const staticLatest = await mapLatestReportResponse({ report: report(projectRoot, false), projectRoot });
  assert(validateLatestReportResponse(staticLatest).ok, "static latest validates");
  assert.equal(staticLatest.state, "valid");
  if (staticLatest.state !== "valid") throw new Error("expected valid static latest");
  assert.equal(staticLatest.runtimeScanSummary, null);
  assert.equal(staticLatest.staticScan?.issueCount, 1);
  assert.equal(JSON.stringify(staticLatest).includes(projectRoot), false, "latest response must not expose absolute project root");

  const runtimeLatest = await mapLatestReportResponse({ report: report(projectRoot, true), projectRoot });
  assert(validateLatestReportResponse(runtimeLatest).ok, "runtime latest validates");
  assert.equal(runtimeLatest.state, "valid");
  if (runtimeLatest.state !== "valid") throw new Error("expected valid runtime latest");
  assert.equal(runtimeLatest.report.runtimeScan, null, "latest response report should not duplicate heavy runtime artifact");
  assert.equal(runtimeLatest.runtimeScanSummary?.issueCount, 3);
  assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.total, 3);
  assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.bySeverity.error, 1);
  assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.bySeverity.warning, 2);
  assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.byType["horizontal-overflow"], 1);
  assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.byType["small-click-target"], 2);
  assert.ok(runtimeLatest.artifactRefs?.every((ref) => !path.isAbsolute(ref.ref)), "artifact refs are relative");
  assert.equal(JSON.stringify(runtimeLatest).includes("raw-secret"), false);
};

void main().then(() => console.log("latest report mapper self-check passed"));
