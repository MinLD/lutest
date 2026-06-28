import type { ScanResponse } from "@lutest/contracts";
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
  const paths = await pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  await Promise.all([
    storageService.writeJson(input.report.reportPath, input.report),
    storageService.writeJson(paths.latestReportPath, input.report),
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