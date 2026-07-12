import assert from "node:assert/strict";
import fs from "node:fs/promises";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { validateRuntimeArtifactDetailResponse } from "@lutest/contracts";
import { createApp } from "../../app";
import { HttpError } from "../../shared/errors/http-error";
import { DEFAULT_RUNTIME_SCAN_LIMITS } from "../runtime-scan/runtime-scan-limits";
import {
  runtimeScanArtifactPaths,
  saveLatestRuntimeScan,
} from "../runtime-scan/runtime-scan-artifacts";
import {
  RUNTIME_SCAN_SCHEMA_VERSION,
  type RuntimeScanResult,
} from "../runtime-scan/runtime-scan.schema";
import { runtimeArtifactDetailService } from "./runtime-artifact-detail.service";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const sample = (projectRoot: string, screenshotPath: string): RuntimeScanResult => ({
  schemaVersion: RUNTIME_SCAN_SCHEMA_VERSION,
  scanId: "runtime_detail_check",
  generatedAt: "2026-07-10T00:00:01.000Z",
  projectRoot,
  selectedRoot: projectRoot,
  baseUrl: "http://127.0.0.1:3000",
  startedAt: "2026-07-10T00:00:00.000Z",
  finishedAt: "2026-07-10T00:00:01.000Z",
  targets: [{ id: "route:1", kind: "route", route: "/" }],
  routes: [{
    targetId: "route:1",
    target: { id: "route:1", kind: "route", route: "/" },
    route: "/",
    consoleMessages: [],
    pageErrors: [],
    networkErrors: [],
    failedResponses: [],
    viewportResults: [{
      viewport: { width: 1440, height: 900 },
      screenshotPath,
      consoleMessages: [
        { type: "warning", text: "fixture warning" },
        { type: "error", text: "token=secret\n at /home/user/app.ts:1" },
      ],
      pageErrors: ["fixture page error"],
      networkErrors: [{ url: "http://127.0.0.1:9/failure", method: "GET", failureText: "connection refused" }],
      failedResponses: [{ url: "http://127.0.0.1:3000/failure", status: 503, statusText: "Service Unavailable" }],
      domGeometry: {
        viewport: { width: 1440, height: 900 },
        capturedAt: "2026-07-10T00:00:00.500Z",
        elementCount: 1,
        truncated: false,
        readabilityCoverage: { candidateTextCount: 2, checkedTextCount: 1, skippedTextCount: 1, skippedByReason: { "text-shadow": 1 }, incomplete: false },
        elements: [{
          internalId: "el-2",
          tagName: "P",
          selectorHint: "p.low-contrast",
          textSnippet: "Low contrast evidence",
          rect: { x: 20, y: 40, width: 200, height: 24, top: 40, right: 220, bottom: 64, left: 20 },
          visibility: { display: "block", visibility: "visible", opacity: 1 },
          textStyle: { foregroundColor: "#d4d9e0", backgroundColor: "#f8fafc", fontSizePx: 16, fontWeight: 400, largeText: false },
          clickable: false,
          order: 0,
        }],
      },
      layoutIssues: [{
        id: "route:1:1440x900:small-click-target:el-1",
        type: "small-click-target",
        code: "small-click-target",
        severity: "warning",
        message: "Clickable target is smaller than the minimum comfortable touch size.",
        scanTargetId: "route:1",
        route: "/",
        viewport: { width: 1440, height: 900 },
        elementRef: "el-1",
        evidence: {
          selectorHint: "button.primary",
          boundingBox: { x: 0, y: 0, width: 20, height: 20, top: 0, right: 20, bottom: 20, left: 0 },
          viewport: { width: 1440, height: 900 },
          screenshotPath,
          threshold: "minimum 44x44px",
        },
      }, {
        id: "route:1:1440x900:low-text-contrast:el-2",
        type: "low-text-contrast",
        code: "low-text-contrast",
        severity: "warning",
        message: "Text and background colors do not meet the WCAG 2.2 AA contrast requirement.",
        scanTargetId: "route:1",
        route: "/",
        viewport: { width: 1440, height: 900 },
        elementRef: "el-2",
        evidence: {
          selectorHint: "p.low-contrast",
          boundingBox: { x: 20, y: 40, width: 200, height: 24, top: 40, right: 220, bottom: 64, left: 20 },
          viewport: { width: 1440, height: 900 },
          screenshotPath,
          threshold: "4.5:1 minimum contrast for normal text",
          foregroundColor: "#d4d9e0",
          backgroundColor: "#f8fafc",
          contrastRatio: 1.36,
          requiredContrastRatio: 4.5,
          foregroundOklch: { l: 0.87, c: 0.01, h: 250 },
          backgroundOklch: { l: 0.98, c: 0.005, h: 250 },
          oklchDelta: { lightness: 0.11, chroma: 0.005, hue: 0 },
          suggestedForegroundColor: "#475569",
          suggestionReason: "Adjust foreground OKLCH lightness while preserving approximate hue/chroma to meet WCAG AA 4.5:1.",
        },
      }],
    }],
    durationMs: 1000,
  }],
  limits: DEFAULT_RUNTIME_SCAN_LIMITS,
  errors: [{ code: "RUNTIME_SCAN_FAILED", message: "token=secret\n at /home/user/app.ts:1" }],
  summary: {
    routeCount: 1,
    targetCount: 1,
    consoleMessageCount: 0,
    pageErrorCount: 0,
    networkErrorCount: 0,
    failedResponseCount: 0,
    screenshotCount: 1,
    errorCount: 1,
  },
  artifacts: {
    rootDir: path.join(projectRoot, ".lutest", "runtime"),
    screenshotsDir: path.join(projectRoot, ".lutest", "runtime", "screenshots", "runtime_detail_check"),
    resultPath: path.join(projectRoot, ".lutest", "runtime", "latest-runtime-scan.json"),
  },
  routeDiscovery: { routes: ["/"], source: "request", reason: "self-check" },
});

const expectHttpError = async (promise: Promise<unknown>, status: number, code: string): Promise<void> => {
  await assert.rejects(promise, (error) => {
    assert(error instanceof HttpError);
    assert.equal(error.statusCode, status);
    assert.equal(error.code, code);
    return true;
  });
};

const listen = (): Promise<{ baseUrl: string; server: http.Server }> => new Promise((resolve) => {
  const server = createApp().listen(0, "127.0.0.1", () => {
    const address = server.address();
    assert(address && typeof address !== "string");
    resolve({ baseUrl: `http://127.0.0.1:${address.port}`, server });
  });
});

const errorCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object" || !("error" in value)) return undefined;
  const error = value.error;
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
};

const main = async (): Promise<void> => {
  const previousProjectPath = process.env.LUTEST_PROJECT_PATH;
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-detail-"));
  const missingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-runtime-detail-missing-"));
  const paths = runtimeScanArtifactPaths({ projectRoot, scanId: "runtime_detail_check" });
  const screenshotPath = path.join(paths.screenshotsDir, "desktop.png");
  await fs.mkdir(paths.screenshotsDir, { recursive: true });
  await fs.writeFile(screenshotPath, png);
  await saveLatestRuntimeScan(sample(projectRoot, screenshotPath));
  process.env.LUTEST_PROJECT_PATH = projectRoot;
  const { baseUrl, server } = await listen();

  try {
    const detail = await runtimeArtifactDetailService.getLatestDetail(projectRoot);
    assert(validateRuntimeArtifactDetailResponse(detail).ok);
    const serialized = JSON.stringify(detail);
    for (const forbidden of [projectRoot, ".lutest", "token=secret", "cookie=", "password=", "storageState", "localStorage", "sessionStorage", "\n at "]) {
      assert(!serialized.includes(forbidden), `detail must not expose ${forbidden}`);
    }
    const screenshot = detail.targetResults[0]?.viewportResults[0]?.screenshot;
    const contrastEvidence = detail.targetResults[0]?.viewportResults[0]?.issues.find((issue) => issue.type === "low-text-contrast")?.evidence;
    assert.deepEqual(detail.targetResults[0]?.viewportResults[0]?.readabilityCoverage, { candidateTextCount: 2, checkedTextCount: 1, skippedTextCount: 1, skippedByReason: { "text-shadow": 1 }, incomplete: false });
    assert.equal(contrastEvidence?.foregroundColor, "#d4d9e0");
    assert.equal(contrastEvidence?.backgroundColor, "#f8fafc");
    assert.equal(contrastEvidence?.contrastRatio, 1.36);
    assert.equal(contrastEvidence?.requiredContrastRatio, 4.5);
    assert.deepEqual(contrastEvidence?.foregroundOklch, { l: 0.87, c: 0.01, h: 250 });
    assert.deepEqual(contrastEvidence?.backgroundOklch, { l: 0.98, c: 0.005, h: 250 });
    assert.deepEqual(contrastEvidence?.oklchDelta, { lightness: 0.11, chroma: 0.005, hue: 0 });
    assert.equal(contrastEvidence?.suggestedForegroundColor, "#475569");
    assert.match(contrastEvidence?.suggestionReason ?? "", /WCAG AA 4\.5:1/);
    const diagnostics = detail.targetResults[0]?.viewportResults[0]?.diagnostics ?? [];
    assert.equal(diagnostics.length, 5);
    assert(diagnostics.some((diagnostic) => diagnostic.kind === "console-warning" && diagnostic.message === "fixture warning"));
    assert(diagnostics.some((diagnostic) => diagnostic.kind === "console-error" && diagnostic.message === "Runtime console diagnostic redacted."));
    assert(diagnostics.some((diagnostic) => diagnostic.kind === "page-error"));
    assert(diagnostics.some((diagnostic) => diagnostic.kind === "network-error"));
    assert(diagnostics.some((diagnostic) => diagnostic.kind === "failed-response"));
    assert.equal(screenshot?.available, true);
    assert.match(screenshot?.ref ?? "", /^shot_[a-f0-9]{32}$/);
    assert.deepEqual(await runtimeArtifactDetailService.getScreenshot(projectRoot, screenshot?.ref ?? ""), png);
    await expectHttpError(runtimeArtifactDetailService.getScreenshot(projectRoot, "shot_ffffffffffffffffffffffffffffffff"), 404, "RUNTIME_SCREENSHOT_NOT_FOUND");

    const detailResponse = await fetch(`${baseUrl}/api/report/runtime/latest`);
    const detailBody: unknown = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    assert(validateRuntimeArtifactDetailResponse(detailBody).ok);
    assert(!JSON.stringify(detailBody).includes(projectRoot));
    const screenshotResponse = await fetch(`${baseUrl}/api/report/runtime/screenshot?ref=${screenshot?.ref ?? ""}`);
    assert.equal(screenshotResponse.status, 200);
    assert.equal(screenshotResponse.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await screenshotResponse.arrayBuffer()), png);
    const traversalResponse = await fetch(`${baseUrl}/api/report/runtime/screenshot?ref=${encodeURIComponent("../screenshot.png")}`);
    assert.equal(traversalResponse.status, 400);
    assert.equal(errorCode(await traversalResponse.json()), "INVALID_REQUEST");

    await fs.rm(screenshotPath);
    const missingScreenshotDetail = await runtimeArtifactDetailService.getLatestDetail(projectRoot);
    assert.deepEqual(missingScreenshotDetail.targetResults[0]?.viewportResults[0]?.screenshot, { available: false, missingReason: "artifact-missing" });

    const outsidePath = path.join(projectRoot, "outside.png");
    await fs.writeFile(outsidePath, png);
    await saveLatestRuntimeScan(sample(projectRoot, outsidePath));
    const unsafeDetail = await runtimeArtifactDetailService.getLatestDetail(projectRoot);
    assert.deepEqual(unsafeDetail.targetResults[0]?.viewportResults[0]?.screenshot, { available: false, missingReason: "artifact-invalid" });
    assert(!JSON.stringify(unsafeDetail).includes(outsidePath));

    await expectHttpError(runtimeArtifactDetailService.getLatestDetail(missingRoot), 404, "RUNTIME_ARTIFACT_NOT_FOUND");
    await fs.mkdir(path.dirname(paths.latestResultPath), { recursive: true });
    await fs.writeFile(paths.latestResultPath, "{bad-json", "utf-8");
    await expectHttpError(runtimeArtifactDetailService.getLatestDetail(projectRoot), 500, "RUNTIME_ARTIFACT_MALFORMED");
    const malformedResponse = await fetch(`${baseUrl}/api/report/runtime/latest`);
    assert.equal(malformedResponse.status, 500);
    assert.equal(errorCode(await malformedResponse.json()), "RUNTIME_ARTIFACT_MALFORMED");
    await fs.rm(paths.latestResultPath);
    const missingResponse = await fetch(`${baseUrl}/api/report/runtime/latest`);
    assert.equal(missingResponse.status, 404);
    assert.equal(errorCode(await missingResponse.json()), "RUNTIME_ARTIFACT_NOT_FOUND");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousProjectPath === undefined) delete process.env.LUTEST_PROJECT_PATH;
    else process.env.LUTEST_PROJECT_PATH = previousProjectPath;
  }
  console.log("runtime artifact detail self-check passed");
};

void main();
