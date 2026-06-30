import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ScanResponse } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import { reportService } from "./report.service";

const latestPath = (root: string): string =>
  path.join(root, ".lutest", "latest-report.json");

const validReport = (root: string): ScanResponse => ({
  scanId: "scan-1",
  startedAt: new Date(0).toISOString(),
  finishedAt: new Date(1).toISOString(),
  status: "passed",
  project: {
    name: "fixture",
    rootDir: root.replaceAll("\\", "/"),
    lutestDir: path.join(root, ".lutest").replaceAll("\\", "/"),
    packageJsonExists: false,
    detectedFramework: "unknown",
    sourceFileCount: 0,
  },
  sourceFileCount: 0,
  issues: [],
  reportPath: latestPath(root).replaceAll("\\", "/"),
});

const assertReportError = async (
  fn: () => Promise<unknown>,
  code: string,
): Promise<void> => {
  await assert.rejects(
    fn,
    (error: unknown) => error instanceof HttpError && error.code === code,
  );
};

async function main(): Promise<void> {
  const oldProjectPath = process.env.LUTEST_PROJECT_PATH;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-report-"));
  process.env.LUTEST_PROJECT_PATH = root;

  try {
    const missing = await reportService.getLatestReport({ cwd: root });
    assert.equal(missing.state, "missing");
    assert.equal(missing.report, null);

    await fs.mkdir(path.join(root, ".lutest"), { recursive: true });
    await fs.writeFile(latestPath(root), "{", "utf-8");
    await assertReportError(
      () => reportService.getLatestReport({ cwd: root }),
      "REPORT_MALFORMED",
    );

    await fs.writeFile(latestPath(root), JSON.stringify({ scanId: "x" }), "utf-8");
    await assertReportError(
      () => reportService.getLatestReport({ cwd: root }),
      "REPORT_SCHEMA_INVALID",
    );

    await fs.writeFile(latestPath(root), JSON.stringify(validReport(root)), "utf-8");
    const valid = await reportService.getLatestReport({ cwd: root });
    assert.equal(valid.state, "valid");
    assert.equal(valid.report.scanId, "scan-1");

    console.log("report integrity self-check passed");
  } finally {
    if (oldProjectPath === undefined) {
      delete process.env.LUTEST_PROJECT_PATH;
    } else {
      process.env.LUTEST_PROJECT_PATH = oldProjectPath;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
