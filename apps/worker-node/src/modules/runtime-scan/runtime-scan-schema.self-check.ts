import assert from "node:assert/strict";
import { resolveRuntimeArtifactRepositoryPaths } from "./runtime-scan-artifact-contract";
import { DEFAULT_RUNTIME_SCAN_LIMITS, resolveRuntimeScanLimits } from "./runtime-scan-limits";
import { RUNTIME_SCAN_SCHEMA_VERSION, validateRuntimeScanResult } from "./runtime-scan.schema";
import type { RuntimeScanResult } from "./runtime-scan.schema";

const main = () => {
  const limits = resolveRuntimeScanLimits({ routeTimeoutMs: 1234 });
  assert.equal(limits.routeTimeoutMs, 1234);
  assert.equal(limits.maxRoutes, DEFAULT_RUNTIME_SCAN_LIMITS.maxRoutes);
  assert(limits.ignoredTags.includes("SCRIPT"));

  const paths = resolveRuntimeArtifactRepositoryPaths({ projectRoot: "D:/repo/app", scanId: "runtime_1" });
  assert(paths.resultPath.endsWith("runtime-scan.json"));
  assert(paths.latestResultPath.endsWith("latest-runtime-scan.json"));
  assert(paths.metaPath.endsWith("latest-runtime-scan.meta.json"));

  const artifact: RuntimeScanResult = {
    schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
    scanId: "runtime_1",
    generatedAt: "2026-07-07T00:00:00.000Z",
    projectRoot: "D:/repo/app",
    selectedRoot: "D:/repo/app",
    baseUrl: "http://127.0.0.1:3000",
    startedAt: "2026-07-07T00:00:00.000Z",
    finishedAt: "2026-07-07T00:00:01.000Z",
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
      durationMs: 10,
    }],
    limits,
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
      rootDir: paths.rootDir,
      screenshotsDir: paths.screenshotsDir,
      resultPath: paths.resultPath,
    },
    routeDiscovery: {
      routes: ["/"],
      source: "request",
      reason: "self-check",
    },
  };

  assert.equal(validateRuntimeScanResult(artifact).schemaVersion, RUNTIME_SCAN_SCHEMA_VERSION);
  assert.throws(() => validateRuntimeScanResult({ ...artifact, schemaVersion: "bad" }), /schemaVersion/);
  assert.throws(() => validateRuntimeScanResult({ ...artifact, limits: { ...limits, maxRoutes: "25" } }), /maxRoutes/);

  console.log("runtime scan schema self-check passed");
};

main();
