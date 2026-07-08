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
  assert(paths.resultPath.endsWith("latest-runtime-scan.json"));
  assert(paths.latestResultPath.endsWith("latest-runtime-scan.json"));
  assert(paths.metaPath.endsWith("latest-runtime-scan.meta.json"));
  assert(paths.snapshotPath.endsWith("runtime_1.json"));

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
    targetDiscovery: {
      mode: "selected-routes",
      targetIds: ["route:1"],
      reason: "self-check",
    },
    routeDiscovery: {
      routes: ["/"],
      source: "request",
      mode: "selected-routes",
      reason: "self-check",
    },
  };

  assert.equal(validateRuntimeScanResult(artifact).schemaVersion, RUNTIME_SCAN_SCHEMA_VERSION);
  artifact.routes[0].viewportResults[0].domGeometry = {
    viewport: { width: 1440, height: 900 },
    capturedAt: "2026-01-01T00:00:00.000Z",
    elementCount: 1,
    truncated: false,
    elements: [{
      internalId: "el:1",
      tagName: "MAIN",
      selectorHint: "main",
      textSnippet: "Hello",
      rect: { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 },
      visibility: { display: "block", visibility: "visible", opacity: 1 },
      clickable: false,
      order: 0,
    }],
  };
  assert.equal(validateRuntimeScanResult(artifact).routes[0].viewportResults[0]?.domGeometry?.elementCount, 1);
  artifact.routes[0].viewportResults[0].layoutIssues = [{
    id: "issue:1",
    type: "small-click-target",
    code: "small-click-target",
    severity: "warning",
    message: "Small click target",
    scanTargetId: "route:1",
    route: "/",
    viewport: { width: 1440, height: 900 },
    elementRef: "el:1",
    evidence: {
      selectorHint: "main",
      boundingBox: { x: 0, y: 0, width: 20, height: 20, top: 0, right: 20, bottom: 20, left: 0 },
      viewport: { width: 1440, height: 900 },
      threshold: "44x44px",
    },
  }];
  assert.equal(validateRuntimeScanResult(artifact).routes[0].viewportResults[0]?.layoutIssues[0]?.code, "small-click-target");
  assert.throws(() => validateRuntimeScanResult({
    ...artifact,
    routes: [{
      ...artifact.routes[0],
      viewportResults: [{
        ...artifact.routes[0].viewportResults[0],
        layoutIssues: [{ ...artifact.routes[0].viewportResults[0].layoutIssues[0], code: "horizontal-overflow" }],
      }],
    }],
  }), /code must equal type/);
  assert.throws(() => validateRuntimeScanResult({ ...artifact, schemaVersion: "bad" }), /schemaVersion/);
  assert.throws(() => validateRuntimeScanResult({ ...artifact, targets: [{ id: "bad", kind: "bad" }] }), /target kind/);
  assert.throws(() => validateRuntimeScanResult({
    ...artifact,
    targets: [{ id: "flow:1", kind: "flow", name: "bad", steps: [{ kind: "fill", selector: "#secret", value: "secret" }] }],
  }), /fill values must be redacted/);
  assert.throws(() => validateRuntimeScanResult({ ...artifact, limits: { ...limits, maxRoutes: "25" } }), /maxRoutes/);

  console.log("runtime scan schema self-check passed");
};

main();
