import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  validateRuntimeArtifactDetailResponse,
  type RuntimeArtifactDetailResponse,
  type RuntimeArtifactScreenshotEvidence,
  type RuntimeArtifactTargetDetail,
  type RuntimeLayoutIssue,
} from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import {
  getRuntimeArtifactPaths,
  readLatestRuntimeScan,
  RuntimeScanArtifactError,
} from "../runtime-scan/runtime-scan-artifacts";
import type {
  RuntimeRouteResult,
  RuntimeScanResult,
  RuntimeViewportResult,
} from "../runtime-scan/runtime-scan.schema";

const SCREENSHOT_REF_PREFIX = "shot_";
const SCREENSHOT_REF_HEX_LENGTH = 32;

const isInside = (parent: string, candidate: string): boolean => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const screenshotRef = (scanId: string, relativePath: string): string =>
  `${SCREENSHOT_REF_PREFIX}${crypto.createHash("sha256").update(`${scanId}\0${relativePath.replaceAll("\\", "/")}`).digest("hex").slice(0, SCREENSHOT_REF_HEX_LENGTH)}`;

const isNotFound = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const resolveScreenshotFile = async (input: {
  projectRoot: string;
  scanId: string;
  screenshotPath: string;
}): Promise<{ filePath: string; ref: string } | null> => {
  if (/^[a-zA-Z]:[\\/]/.test(input.screenshotPath)) return null;
  const paths = getRuntimeArtifactPaths({ projectRoot: input.projectRoot, scanId: input.scanId });
  const screenshotsRoot = path.resolve(paths.screenshotsDir);
  const candidate = path.isAbsolute(input.screenshotPath)
    ? path.resolve(input.screenshotPath)
    : path.resolve(input.projectRoot, input.screenshotPath);
  if (!isInside(screenshotsRoot, candidate) || path.extname(candidate).toLowerCase() !== ".png") return null;

  try {
    const [realRoot, realFile] = await Promise.all([
      fs.realpath(screenshotsRoot),
      fs.realpath(candidate),
    ]);
    if (!isInside(realRoot, realFile) || path.extname(realFile).toLowerCase() !== ".png") return null;
    const stat = await fs.stat(realFile);
    if (!stat.isFile()) return null;
    return { filePath: realFile, ref: screenshotRef(input.scanId, path.relative(realRoot, realFile)) };
  } catch (error) {
    if (isNotFound(error)) return null;
    return null;
  }
};

const screenshotEvidence = async (input: {
  projectRoot: string;
  scanId: string;
  screenshotPath?: string;
  captureFailed: boolean;
}): Promise<RuntimeArtifactScreenshotEvidence> => {
  if (!input.screenshotPath) {
    return { available: false, missingReason: input.captureFailed ? "capture-failed" : "not-captured" };
  }
  const resolved = await resolveScreenshotFile({
    projectRoot: input.projectRoot,
    scanId: input.scanId,
    screenshotPath: input.screenshotPath,
  });
  if (!resolved) {
    const paths = getRuntimeArtifactPaths({ projectRoot: input.projectRoot, scanId: input.scanId });
    const candidate = path.isAbsolute(input.screenshotPath)
      ? path.resolve(input.screenshotPath)
      : path.resolve(input.projectRoot, input.screenshotPath);
    return {
      available: false,
      missingReason: isInside(path.resolve(paths.screenshotsDir), candidate) ? "artifact-missing" : "artifact-invalid",
    };
  }
  return { available: true, ref: resolved.ref };
};

const targetStatus = (route: RuntimeRouteResult): RuntimeArtifactTargetDetail["status"] => {
  const failed = Boolean(route.error) || route.viewportResults.some((viewport) => Boolean(viewport.error)) || (route.executionSteps ?? []).some((step) => step.status === "failed");
  if (failed) return "failed";
  if (route.viewportResults.some((viewport) => viewport.layoutIssues.length > 0)) return "warning";
  return "passed";
};

const stateFields = (route: RuntimeRouteResult): Pick<RuntimeArtifactTargetDetail, "stateId" | "stateLabel"> =>
  route.target.kind === "route"
    ? {}
    : { stateId: route.target.id, stateLabel: route.target.name };

type RuntimeArtifactViewportDetailIssue = RuntimeArtifactTargetDetail["viewportResults"][number]["issues"][number];

const issueDetail = async (input: {
  projectRoot: string;
  scanId: string;
  route: RuntimeRouteResult;
  viewport: RuntimeViewportResult;
  issue: RuntimeLayoutIssue;
  fallbackScreenshot: RuntimeArtifactScreenshotEvidence;
}): Promise<RuntimeArtifactViewportDetailIssue> => {
  const issueScreenshot = input.issue.evidence.screenshotPath
    ? await screenshotEvidence({
        projectRoot: input.projectRoot,
        scanId: input.scanId,
        screenshotPath: input.issue.evidence.screenshotPath,
        captureFailed: Boolean(input.viewport.screenshotError),
      })
    : input.fallbackScreenshot;
  const state = stateFields(input.route);
  return {
    id: input.issue.id,
    type: input.issue.type,
    severity: input.issue.severity,
    message: input.issue.message,
    evidence: {
      scanTargetId: input.issue.scanTargetId,
      route: input.issue.route,
      ...state,
      viewport: input.issue.viewport,
      selector: input.issue.evidence.selectorHint,
      elementRef: input.issue.elementRef,
      boundingBox: input.issue.evidence.boundingBox,
      relatedBoundingBox: input.issue.evidence.relatedBoundingBox,
      screenshot: issueScreenshot,
      reason: input.issue.evidence.threshold,
      dedupKey: input.issue.id,
      stateDedupKey: state.stateId,
    },
  };
};

const mapTarget = async (input: {
  projectRoot: string;
  scanId: string;
  route: RuntimeRouteResult;
}): Promise<RuntimeArtifactTargetDetail> => {
  const viewportResults = await Promise.all(input.route.viewportResults.map(async (viewport) => {
    const screenshot = await screenshotEvidence({
      projectRoot: input.projectRoot,
      scanId: input.scanId,
      screenshotPath: viewport.screenshotPath,
      captureFailed: Boolean(viewport.screenshotError),
    });
    const issues = await Promise.all(viewport.layoutIssues.map((issue) => issueDetail({
      projectRoot: input.projectRoot,
      scanId: input.scanId,
      route: input.route,
      viewport,
      issue,
      fallbackScreenshot: screenshot,
    })));
    return { viewport: viewport.viewport, screenshot, issues };
  }));
  return {
    scanTargetId: input.route.targetId,
    kind: input.route.target.kind,
    route: input.route.route,
    ...stateFields(input.route),
    status: targetStatus(input.route),
    viewportResults,
  };
};

const mapDetail = async (projectRoot: string, artifact: RuntimeScanResult): Promise<RuntimeArtifactDetailResponse> => {
  const targetResults = await Promise.all(artifact.routes.map((route) => mapTarget({ projectRoot, scanId: artifact.scanId, route })));
  const viewportCount = targetResults.reduce((sum, target) => sum + target.viewportResults.length, 0);
  const screenshotCount = targetResults.reduce((sum, target) => sum + target.viewportResults.filter((viewport) => viewport.screenshot.available).length, 0);
  const issueCount = targetResults.reduce((sum, target) => sum + target.viewportResults.reduce((inner, viewport) => inner + viewport.issues.length, 0), 0);
  const failedTargets = targetResults.filter((target) => target.status === "failed").length;
  const status = artifact.errors.length > 0 || (targetResults.length > 0 && failedTargets === targetResults.length)
    ? "failed"
    : failedTargets > 0 || issueCount > 0
      ? "warning"
      : "passed";
  const detail: RuntimeArtifactDetailResponse = {
    scanId: artifact.scanId,
    status,
    startedAt: artifact.startedAt,
    finishedAt: artifact.finishedAt,
    durationMs: Math.max(0, Date.parse(artifact.finishedAt) - Date.parse(artifact.startedAt)) || 0,
    baseUrl: artifact.baseUrl,
    summary: {
      targetCount: targetResults.length,
      viewportCount,
      screenshotCount,
      issueCount,
      errorCount: artifact.summary.errorCount,
    },
    targetResults,
  };
  const validation = validateRuntimeArtifactDetailResponse(detail);
  if (!validation.ok) throw new HttpError(500, "RUNTIME_ARTIFACT_INVALID", "Runtime artifact detail is invalid.");
  return validation.value;
};

const readLatest = async (projectRoot: string): Promise<RuntimeScanResult> => {
  try {
    const artifact = await readLatestRuntimeScan(projectRoot);
    if (!artifact) throw new HttpError(404, "RUNTIME_ARTIFACT_NOT_FOUND", "Latest runtime artifact was not found.");
    return artifact;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof RuntimeScanArtifactError) {
      if (error.code === "RUNTIME_SCAN_ARTIFACT_MALFORMED") throw new HttpError(500, "RUNTIME_ARTIFACT_MALFORMED", "Latest runtime artifact is malformed.");
      if (error.code === "RUNTIME_SCAN_ARTIFACT_INVALID") throw new HttpError(500, "RUNTIME_ARTIFACT_INVALID", "Latest runtime artifact is invalid.");
      throw new HttpError(500, "RUNTIME_ARTIFACT_READ_FAILED", "Latest runtime artifact could not be read.");
    }
    throw new HttpError(500, "RUNTIME_ARTIFACT_READ_FAILED", "Latest runtime artifact could not be read.");
  }
};

const getLatestDetail = async (projectRoot: string): Promise<RuntimeArtifactDetailResponse> =>
  mapDetail(projectRoot, await readLatest(projectRoot));

const getScreenshot = async (projectRoot: string, ref: string): Promise<Buffer> => {
  const artifact = await readLatest(projectRoot);
  const screenshotPaths = artifact.routes.flatMap((route) => route.viewportResults.flatMap((viewport) => [
    viewport.screenshotPath,
    ...viewport.layoutIssues.map((issue) => issue.evidence.screenshotPath),
  ])).filter((candidate): candidate is string => typeof candidate === "string");

  for (const candidate of screenshotPaths) {
    const resolved = await resolveScreenshotFile({ projectRoot, scanId: artifact.scanId, screenshotPath: candidate });
    if (resolved?.ref !== ref) continue;
    try {
      return await fs.readFile(resolved.filePath);
    } catch {
      throw new HttpError(404, "RUNTIME_SCREENSHOT_NOT_FOUND", "Runtime screenshot was not found.");
    }
  }
  throw new HttpError(404, "RUNTIME_SCREENSHOT_NOT_FOUND", "Runtime screenshot was not found.");
};

export const runtimeArtifactDetailService = { getLatestDetail, getScreenshot };
