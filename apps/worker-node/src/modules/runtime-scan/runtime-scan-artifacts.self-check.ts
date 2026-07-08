import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readLatestRuntimeScan,
  runtimeScanArtifactPaths,
  saveLatestRuntimeScan,
  RuntimeScanArtifactError,
} from "./runtime-scan-artifacts";
import { DEFAULT_RUNTIME_SCAN_LIMITS } from "./runtime-scan-limits";
import { RUNTIME_SCAN_SCHEMA_VERSION, validateRuntimeScanResult, type RuntimeScanResult } from "./runtime-scan.schema";

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sample = (projectRoot: string): RuntimeScanResult => ({
  schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
  scanId: "runtime_self_check",
  generatedAt: "2026-01-01T00:00:00.000Z",
  projectRoot,
  selectedRoot: projectRoot,
  baseUrl: "http://127.0.0.1:3000",
  startedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: "2026-01-01T00:00:01.000Z",
  targets: [{ id: "route:1", kind: "route", route: "/" }],
  routes: [{
    targetId: "route:1",
    target: { id: "route:1", kind: "route", route: "/" },
    route: "/",
    url: "http://127.0.0.1:3000/",
    status: 200,
    consoleMessages: [],
    pageErrors: [],
    networkErrors: [],
    failedResponses: [],
    viewportResults: [{ viewport: { width: 1440, height: 900 }, layoutIssues: [] }],
    durationMs: 1,
  }],
  limits: DEFAULT_RUNTIME_SCAN_LIMITS,
  errors: [],
  summary: {
    routeCount: 1,
    targetCount: 1,
    consoleMessageCount: 0,
    pageErrorCount: 0,
    networkErrorCount: 0,
    failedResponseCount: 0,
    screenshotCount: 0,
    errorCount: 0,
  },
  artifacts: {
    rootDir: path.join(projectRoot, ".lutest", "runtime"),
    screenshotsDir: path.join(projectRoot, ".lutest", "runtime", "screenshots", "runtime_self_check"),
    resultPath: path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json"),
  },
  targetDiscovery: { mode: "selected-routes", targetIds: ["route:1"], reason: "self-check" },
  routeDiscovery: { routes: ["/"], source: "request", mode: "selected-routes", reason: "self-check" },
});

const main = async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-artifacts-"));
  const missingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-artifacts-missing-"));
  const paths = runtimeScanArtifactPaths({ projectRoot, scanId: "runtime_self_check" });

  for (const candidate of Object.values(paths)) {
    const relative = path.relative(projectRoot, candidate);
    assert(!relative.startsWith(".."));
    assert(!path.isAbsolute(relative));
  }
  assert.equal(paths.latestResultPath, path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json"));
  assert.equal(paths.metaPath, path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.meta.json"));
  assert.equal(paths.snapshotPath, path.join(projectRoot, ".lutest", "runtime", "scans", "runtime_self_check.json"));
  assert.throws(() => runtimeScanArtifactPaths({ projectRoot, scanId: "../escape" }), /path-safe/);

  const artifact = sample(projectRoot);
  const saved = await saveLatestRuntimeScan(artifact);
  assert.equal(await exists(paths.latestResultPath), true);
  assert.equal(await exists(paths.metaPath), true);
  assert.equal(await exists(paths.snapshotPath), true);
  assert.equal(saved.meta.targetCount, 1);
  assert.equal(saved.meta.errorCount, 0);

  const latestRaw = JSON.parse(await fs.readFile(paths.latestResultPath, "utf-8"));
  assert.equal(validateRuntimeScanResult(latestRaw).scanId, artifact.scanId);
  const latest = await readLatestRuntimeScan(projectRoot);
  assert.equal(latest?.scanId, artifact.scanId);
  assert.equal(await readLatestRuntimeScan(missingRoot), null);

  await fs.writeFile(paths.latestResultPath, JSON.stringify({ schemaVersion: "bad" }), "utf-8");
  await assert.rejects(readLatestRuntimeScan(projectRoot), (error) => {
    assert(error instanceof RuntimeScanArtifactError);
    assert.equal(error.code, "RUNTIME_SCAN_ARTIFACT_INVALID");
    assert(error.message.includes("invalid"));
    return true;
  });

  console.log("runtime scan artifacts self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
