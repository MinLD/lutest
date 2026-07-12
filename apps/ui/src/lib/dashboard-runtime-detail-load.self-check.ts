import assert from "node:assert/strict";
import type { LatestReportResponse, RuntimeArtifactDetailResponse } from "@lutest/contracts";
import { loadRuntimeArtifactDetail } from "./use-dashboard-data";

const latestReport = {
  state: "valid",
  report: {
    scanId: "scan-1",
    startedAt: "2026-07-11T00:00:00.000Z",
    finishedAt: "2026-07-11T00:00:01.000Z",
    status: "warning",
    project: { name: "fixture", rootDir: "fixture", lutestDir: "fixture", packageJsonExists: true, detectedFramework: "next" },
    sourceFileCount: 0,
    issues: [],
    reportPath: "report",
    runtimeScan: null,
  },
  runtimeScanSummary: { status: "warning", targetCount: 1, viewportCount: 1, screenshotCount: 1, issueCount: 1, errorCount: 0, issueSummary: { total: 1, bySeverity: { warning: 1 }, byType: { "low-text-contrast": 1 } } },
} satisfies LatestReportResponse;

const detail: RuntimeArtifactDetailResponse = {
  scanId: "runtime-1",
  status: "warning",
  startedAt: "2026-07-11T00:00:00.000Z",
  finishedAt: "2026-07-11T00:00:01.000Z",
  durationMs: 1000,
  baseUrl: "http://127.0.0.1:3400",
  summary: { targetCount: 0, viewportCount: 0, screenshotCount: 0, issueCount: 0, errorCount: 0 },
  targetResults: [],
};

class RuntimeArtifactInvalidError extends Error { readonly code = "RUNTIME_ARTIFACT_INVALID" }
class RuntimeArtifactNotFoundError extends Error { readonly code = "RUNTIME_ARTIFACT_NOT_FOUND" }

const main = async (): Promise<void> => {
  const valid = await loadRuntimeArtifactDetail(latestReport, undefined, async () => detail);
  assert.equal(valid.detail?.scanId, "runtime-1");
  assert.equal(valid.error, null);

  const invalid = await loadRuntimeArtifactDetail(latestReport, undefined, async () => { throw new RuntimeArtifactInvalidError("Latest runtime artifact is invalid."); });
  assert.equal(invalid.detail, null);
  assert.equal(invalid.error, "Latest runtime artifact is invalid.");

  const missing = await loadRuntimeArtifactDetail(latestReport, undefined, async () => { throw new RuntimeArtifactNotFoundError("Missing"); });
  assert.equal(missing.detail, null);
  assert.equal(missing.error, null);

  console.log("dashboard runtime detail load self-check passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
