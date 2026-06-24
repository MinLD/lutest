import type { ScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";

export interface FindLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const findLatest = async (
  input: FindLatestReportInput,
): Promise<ScanResponse | null> => {
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  return storageService.readJson<ScanResponse>(paths.latestReportPath);
};

export const reportRepository = { findLatest };
