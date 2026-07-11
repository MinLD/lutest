import type { ScanResponse } from "@lutest/contracts";
import { validateScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";

export interface FindLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export type LatestReportReadResult =
  | { kind: "ok"; report: ScanResponse }
  | { kind: "missing" }
  | { kind: "malformed"; error: string }
  | { kind: "schema-invalid"; error: string; details?: unknown }
  | { kind: "permission-denied"; error: string }
  | { kind: "unknown-error"; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const withoutScreenshotPath = (value: Record<string, unknown>): Record<string, unknown> => {
  const { screenshotPath: _screenshotPath, ...safe } = value;
  return safe;
};

const sanitizeLegacyRuntimeViewport = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const safe = withoutScreenshotPath(value);
  if (!Array.isArray(value.layoutIssues)) return safe;
  return {
    ...safe,
    layoutIssues: value.layoutIssues.map((issue) => {
      if (!isRecord(issue) || !isRecord(issue.evidence)) return issue;
      return { ...issue, evidence: withoutScreenshotPath(issue.evidence) };
    }),
  };
};

const sanitizeLegacyLatestReport = (value: unknown): unknown => {
  if (!isRecord(value) || !isRecord(value.runtimeScan) || !Array.isArray(value.runtimeScan.targetResults)) return value;
  return {
    ...value,
    runtimeScan: {
      ...value.runtimeScan,
      targetResults: value.runtimeScan.targetResults.map((target) => {
        if (!isRecord(target) || !Array.isArray(target.viewportResults)) return target;
        return { ...target, viewportResults: target.viewportResults.map(sanitizeLegacyRuntimeViewport) };
      }),
    },
  };
};

const findLatest = async (
  input: FindLatestReportInput,
): Promise<LatestReportReadResult> => {
  const paths = await pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  const result = await storageService.readJsonResult<unknown>(
    paths.latestReportPath,
  );

  if (result.kind === "missing") return { kind: "missing" };
  if (result.kind === "malformed") {
    return { kind: "malformed", error: result.error };
  }
  if (result.kind === "permission-denied") {
    return { kind: "permission-denied", error: result.error };
  }
  if (result.kind === "unknown-error") {
    return { kind: "unknown-error", error: result.error };
  }

  const validation = validateScanResponse(sanitizeLegacyLatestReport(result.data));
  if (!validation.ok) {
    return {
      kind: "schema-invalid",
      error: validation.message,
      details: validation.details,
    };
  }

  return { kind: "ok", report: validation.value };
};

export const reportRepository = { findLatest };
