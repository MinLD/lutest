import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getRuntimeArtifactPaths,
  readLatestRuntimeScan,
  readRuntimeScanSnapshot,
  runtimeScanArtifactPaths,
  saveLatestRuntimeScan,
  saveRuntimeScanSnapshot,
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
  targets: [{ id: "flow:1", kind: "flow", name: "redacted", route: "/", steps: [{ kind: "fill", selector: "#secret", valueFromEnv: "LUTEST_SECRET" }] }],
  routes: [{
    targetId: "flow:1",
    target: { id: "flow:1", kind: "flow", name: "redacted", route: "/", steps: [{ kind: "fill", selector: "#secret", valueFromEnv: "LUTEST_SECRET" }] },
    route: "/",
    url: "http://127.0.0.1:3000/",
    status: 200,
    consoleMessages: [],
    pageErrors: [],
    networkErrors: [],
    failedResponses: [],
    executionSteps: [{ kind: "fill", selector: "#secret", status: "passed", durationMs: 1, redacted: true, valueSource: "env", valueFromEnv: "LUTEST_SECRET" }],
    viewportResults: [{
      viewport: { width: 1440, height: 900 },
      screenshotPath: path.join(projectRoot, ".lutest", "runtime", "screenshots", "runtime_self_check", "desktop.png"),
      layoutIssues: [{
        id: "issue:1",
        type: "small-click-target",
        code: "small-click-target",
        severity: "warning",
        message: "Small click target",
        scanTargetId: "flow:1",
        route: "/",
        viewport: { width: 1440, height: 900 },
        elementRef: "el:1",
        evidence: {
          selectorHint: "#button",
          boundingBox: { x: 0, y: 0, width: 20, height: 20, top: 0, right: 20, bottom: 20, left: 0 },
          viewport: { width: 1440, height: 900 },
          threshold: "44x44px",
        },
      }],
    }],
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
    screenshotCount: 1,
    errorCount: 0,
  },
  artifacts: {
    rootDir: path.join(projectRoot, ".lutest", "runtime"),
    screenshotsDir: path.join(projectRoot, ".lutest", "runtime", "screenshots", "runtime_self_check"),
    resultPath: path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json"),
  },
  targetDiscovery: { mode: "custom-targets", targetIds: ["flow:1"], reason: "self-check" },
  routeDiscovery: { routes: ["/"], source: "request", mode: "custom-targets", reason: "self-check" },
});

const assertRejectsArtifact = async (promise: Promise<unknown>, code: RuntimeScanArtifactError["code"]): Promise<void> => {
  await assert.rejects(promise, (error) => {
    assert(error instanceof RuntimeScanArtifactError);
    assert.equal(error.code, code);
    return true;
  });
};

const main = async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-artifacts-"));
  const missingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-artifacts-missing-"));
  const paths = runtimeScanArtifactPaths({ projectRoot, scanId: "runtime_self_check" });

  for (const candidate of Object.values(paths)) {
    const relative = path.relative(path.join(projectRoot, ".lutest", "runtime"), candidate);
    assert(!relative.startsWith(".."));
    assert(!path.isAbsolute(relative));
  }
  assert.equal(getRuntimeArtifactPaths({ projectRoot, scanId: "runtime_self_check" }).latestResultPath, path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json"));
  assert.equal(paths.metaPath, path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.meta.json"));
  assert.equal(paths.snapshotPath, path.join(projectRoot, ".lutest", "runtime", "scans", "runtime_self_check.json"));
  for (const badScanId of ["../escape", "..\\escape", "a/b", "a\\b", "/abs", "C:\\abs", "bad\0id", "bad..id"]) {
    assert.throws(() => runtimeScanArtifactPaths({ projectRoot, scanId: badScanId }), /path-safe/);
  }

  const artifact = sample(projectRoot);
  const saved = await saveLatestRuntimeScan(artifact);
  assert.equal(await exists(paths.latestResultPath), true);
  assert.equal(await exists(paths.metaPath), true);
  assert.equal(await exists(paths.snapshotPath), true);
  assert.equal(saved.meta.targetCount, 1);
  assert.equal(saved.meta.viewportCount, 1);
  assert.equal(saved.meta.screenshotCount, 1);
  assert.equal(saved.meta.issueCount, 1);
  assert.equal(saved.meta.errorCount, 0);

  const latestRawText = await fs.readFile(paths.latestResultPath, "utf-8");
  const metaRawText = await fs.readFile(paths.metaPath, "utf-8");
  assert.equal(validateRuntimeScanResult(JSON.parse(latestRawText)).scanId, artifact.scanId);
  assert(!Object.prototype.hasOwnProperty.call(JSON.parse(latestRawText), "savedAt"));
  assert(!metaRawText.includes("DoNotPersistSecret"));
  assert(!metaRawText.includes("domGeometry"));
  assert(!metaRawText.includes("executionSteps"));

  const latest = await readLatestRuntimeScan(projectRoot);
  assert.equal(latest?.scanId, artifact.scanId);
  assert.equal(latest?.routes[0]?.viewportResults[0]?.layoutIssues[0]?.type, "small-click-target");
  assert.equal(latest?.artifacts.resultPath, paths.latestResultPath);
  assert.equal(await readLatestRuntimeScan(missingRoot), null);

  const snapshot = await readRuntimeScanSnapshot(projectRoot, artifact.scanId);
  assert.equal(snapshot?.scanId, artifact.scanId);
  assert.equal(snapshot?.artifacts.resultPath, paths.snapshotPath);
  const snapshotOnlyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-snapshot-only-"));
  const snapshotOnly = sample(snapshotOnlyRoot);
  await saveRuntimeScanSnapshot(snapshotOnly);
  assert.equal((await readRuntimeScanSnapshot(snapshotOnlyRoot, snapshotOnly.scanId))?.scanId, snapshotOnly.scanId);
  assert.equal(await readLatestRuntimeScan(snapshotOnlyRoot), null);

  const legacyArtifact = JSON.parse(latestRawText) as Record<string, unknown>;
  assert(legacyArtifact.limits && typeof legacyArtifact.limits === "object");
  const legacyLimits = legacyArtifact.limits as Record<string, unknown>;
  delete legacyLimits.maxInteractionsPerRoute;
  delete legacyLimits.maxStatesPerRoute;
  delete legacyLimits.interactionDiscoveryTimeoutMs;
  await fs.writeFile(paths.latestResultPath, JSON.stringify(legacyArtifact), "utf-8");
  const migratedLegacy = await readLatestRuntimeScan(projectRoot);
  assert.equal(migratedLegacy?.limits.maxInteractionsPerRoute, DEFAULT_RUNTIME_SCAN_LIMITS.maxInteractionsPerRoute);
  assert.equal(migratedLegacy?.limits.maxStatesPerRoute, DEFAULT_RUNTIME_SCAN_LIMITS.maxStatesPerRoute);
  assert.equal(migratedLegacy?.limits.interactionDiscoveryTimeoutMs, DEFAULT_RUNTIME_SCAN_LIMITS.interactionDiscoveryTimeoutMs);

  const invalidBeforeWrite = sample(await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-invalid-before-")));
  invalidBeforeWrite.targets = [{ id: "flow:bad", kind: "flow", name: "bad", steps: [{ kind: "fill", selector: "#secret", value: "DoNotPersistSecret" }] }];
  await assertRejectsArtifact(saveLatestRuntimeScan(invalidBeforeWrite), "RUNTIME_SCAN_ARTIFACT_INVALID");
  assert.equal(await exists(path.join(invalidBeforeWrite.projectRoot, ".lutest", "runtime", "latest-runtime-scan.json")), false);

  await fs.writeFile(paths.latestResultPath, "{", "utf-8");
  await assertRejectsArtifact(readLatestRuntimeScan(projectRoot), "RUNTIME_SCAN_ARTIFACT_MALFORMED");
  await fs.writeFile(paths.latestResultPath, JSON.stringify({ schemaVersion: "bad" }), "utf-8");
  await assertRejectsArtifact(readLatestRuntimeScan(projectRoot), "RUNTIME_SCAN_ARTIFACT_INVALID");
  await fs.writeFile(paths.snapshotPath, "{", "utf-8");
  await assertRejectsArtifact(readRuntimeScanSnapshot(projectRoot, artifact.scanId), "RUNTIME_SCAN_ARTIFACT_MALFORMED");

  assert.equal(await exists(path.join(projectRoot, ".lutest", "runtime-scans", artifact.scanId, "runtime-scan.json")), false);
  console.log("runtime scan artifacts self-check passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
