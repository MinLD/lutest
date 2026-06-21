import path from "node:path";
import type { ScanResponse } from "@lutest/contracts";
import { fileSystemService } from "../../shared/services/file-system.service";
import { pathService } from "../../shared/services/path.service";

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

  return fileSystemService.readJsonFile<ScanResponse>({
    filePath: path.join(paths.tlxDir, "latest-report.json"),
  });
};

export const reportRepository = { findLatest };
