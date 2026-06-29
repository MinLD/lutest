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
  | { state: "missing"; report: null; message: string }
  | { state: "malformed"; report: null; message: string }
  | {
      state: "schema-invalid";
      report: null;
      message: string;
      details?: unknown;
    }
  | { state: "permission"; report: null; message: string }
  | { state: "unknown"; report: null; message: string }
  | { state: "valid"; report: ScanResponse };

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

  if (result.status === "missing") {
    return { state: "missing", report: null, message: result.message };
  }

  if (result.status === "malformed") {
    return { state: "malformed", report: null, message: result.message };
  }

  if (result.status === "permission") {
    return { state: "permission", report: null, message: result.message };
  }

  if (result.status === "unknown") {
    return { state: "unknown", report: null, message: result.message };
  }

  const validation = validateScanResponse(result.data);
  if (!validation.ok) {
    return {
      state: "schema-invalid",
      report: null,
      message: validation.message,
      details: validation.details,
    };
  }

  return { state: "valid", report: validation.value };
};

export const reportRepository = { findLatest };
