import type { ScanResponse } from "@lutest/contracts";
import { validateScanResponse } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";

export interface SaveReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  report: ScanResponse;
}


export interface GetLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const saveReport = async (input: SaveReportInput): Promise<void> => {
  const validation = validateScanResponse(input.report);
  if (!validation.ok) {
    throw new HttpError(
      500,
      "REPORT_SCHEMA_INVALID",
      "Scan report does not match ScanResponse schema.",
      validation.message,
    );
  }

  const paths = await pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  await Promise.all([
    storageService.writeJson(input.report.reportPath, validation.value),
    storageService.writeJson(paths.latestReportPath, validation.value),
  ]);
};

const getLatestReport = async (
  input: GetLatestReportInput,
): Promise<ScanResponse | null> => {
  const paths = await pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  
  return storageService.readJson<ScanResponse>(paths.latestReportPath);
};

export const scanRepository = {
  saveReport,
  getLatestReport,
};
