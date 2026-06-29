import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ScanResponse } from "@lutest/contracts";
import { reportService } from "./report.service";

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-report-"));

  try {
    const missing = await reportService.getLatestReport({ cwd: root });
    assert.equal(missing.state, "missing");

    await fs.mkdir(path.join(root, ".lutest"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".lutest", "latest-report.json"),
      "{",
      "utf-8",
    );

    const malformed = await reportService.getLatestReport({ cwd: root });
    assert.equal(malformed.state, "malformed");

    await fs.writeFile(
      path.join(root, ".lutest", "latest-report.json"),
      JSON.stringify({ scanId: "x" }),
      "utf-8",
    );

    const schemaInvalid = await reportService.getLatestReport({ cwd: root });
    assert.equal(schemaInvalid.state, "schema-invalid");

    const validReport: ScanResponse = {
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
      reportPath: path
        .join(root, ".lutest", "latest-report.json")
        .replaceAll("\\", "/"),
    };

    await fs.writeFile(
      path.join(root, ".lutest", "latest-report.json"),
      JSON.stringify(validReport),
      "utf-8",
    );

    const valid = await reportService.getLatestReport({ cwd: root });
    assert.equal(valid.state, "valid");
    assert.equal(valid.report.scanId, "scan-1");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
