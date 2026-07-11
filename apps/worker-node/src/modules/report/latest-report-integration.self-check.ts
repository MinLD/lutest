import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { RuntimeScanResult, ScanResponse } from "@lutest/contracts";
import { validateLatestReportResponse } from "@lutest/contracts";
import { runtimeScanArtifactPaths } from "../runtime-scan/runtime-scan-artifacts";
import { scanRepository } from "../scan/scan.repository";
import { reportService } from "./report.service";

const now = "2026-07-09T00:00:00.000Z";
const viewport = { width: 390, height: 844 };
const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 };

const runtimeScan = (): RuntimeScanResult => ({
  scanId: "runtime-readback",
  status: "warning",
  startedAt: now,
  finishedAt: now,
  durationMs: 1,
  baseUrl: "http://localhost:3000",
  targets: [{ id: "route-1", kind: "route", route: "/" }],
  targetResults: [{ scanTargetId: "route-1", kind: "route", route: "/", status: "warning", errors: [], viewportResults: [{ viewport, consoleErrors: [], pageErrors: [], networkErrors: [], failedResponses: [], errors: [], layoutIssues: [{ id: "issue-1", type: "horizontal-overflow", code: "horizontal-overflow", severity: "warning", message: "Overflow", scanTargetId: "route-1", route: "/", viewport, elementRef: "el-1", evidence: { boundingBox: rect, viewport, threshold: "right <= viewport" } }] }] }],
  summary: { targetCount: 1, viewportCount: 1, screenshotCount: 0, issueCount: 1, errorCount: 0 },
  errors: [],
});

const scan = (projectRoot: string, withRuntime: boolean): ScanResponse => ({
  scanId: withRuntime ? "scan-runtime" : "scan-static",
  startedAt: now,
  finishedAt: now,
  status: "passed",
  project: { name: "readback", rootDir: projectRoot, lutestDir: path.join(projectRoot, ".lutest"), packageJsonExists: true, detectedFramework: "unknown" },
  sourceFileCount: 1,
  issues: [],
  reportPath: path.join(projectRoot, ".lutest", "reports", withRuntime ? "scan-runtime.json" : "scan-static.json"),
  runtimeScan: withRuntime ? runtimeScan() : undefined,
});

const main = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "lutest-r73-readback-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "readback" }), "utf-8");
  const previous = process.env.LUTEST_PROJECT_PATH;
  process.env.LUTEST_PROJECT_PATH = root;
  try {
    await scanRepository.saveReport({ cwd: process.cwd(), projectPath: root, report: scan(root, false) });
    const staticLatest = await reportService.getLatestReport({ cwd: process.cwd(), projectPath: root });
    assert(validateLatestReportResponse(staticLatest).ok, "static latest read-back validates");
    assert.equal(staticLatest.state, "valid");
    if (staticLatest.state !== "valid") throw new Error("expected static valid");
    assert.equal(staticLatest.runtimeScanSummary, null);

    const runtimePaths = runtimeScanArtifactPaths({ projectRoot: root, scanId: "runtime-readback" });
    await fs.mkdir(path.dirname(runtimePaths.latestResultPath), { recursive: true });
    await fs.writeFile(runtimePaths.latestResultPath, "{}", "utf-8");
    await fs.writeFile(runtimePaths.metaPath, "{}", "utf-8");
    await scanRepository.saveReport({ cwd: process.cwd(), projectPath: root, report: scan(root, true) });
    const legacyReport = scan(root, true);
    const legacyViewport = legacyReport.runtimeScan?.targetResults[0]?.viewportResults[0];
    assert(legacyViewport);
    legacyViewport.screenshotPath = path.join(root, ".lutest", "runtime", "legacy.png");
    const legacyIssue = legacyViewport.layoutIssues[0];
    assert(legacyIssue);
    legacyIssue.evidence.screenshotPath = path.join(root, ".lutest", "runtime", "legacy.png");
    await fs.writeFile(path.join(root, ".lutest", "latest-report.json"), JSON.stringify(legacyReport), "utf-8");
    const runtimeLatest = await reportService.getLatestReport({ cwd: process.cwd(), projectPath: root });
    assert(validateLatestReportResponse(runtimeLatest).ok, "runtime latest read-back validates");
    assert.equal(runtimeLatest.state, "valid");
    if (runtimeLatest.state !== "valid") throw new Error("expected runtime valid");
    assert.equal(runtimeLatest.runtimeScanSummary?.issueCount, 1);
    assert.equal(runtimeLatest.runtimeScanSummary?.issueSummary.total, 1);
    assert.equal(runtimeLatest.report.runtimeScan, null);
    assert.ok(runtimeLatest.artifactRefs?.some((ref) => ref.kind === "runtime-scan"));
    assert.equal(JSON.stringify(runtimeLatest).includes(root), false, "latest response must not expose absolute root");
    assert.equal(JSON.stringify(runtimeLatest).includes("screenshotPath"), false, "legacy screenshot paths must be removed before public validation");
  } finally {
    if (previous === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = previous;
  }
};

void main().then(() => console.log("latest report integration self-check passed"));
