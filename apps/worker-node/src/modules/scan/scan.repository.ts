import path from "node:path";
import type { ScanResponse } from "@lutest/contracts";
import { fileSystemService } from "../../shared/services/file-system.service";
import { pathService } from "../../shared/services/path.service";

export interface SaveReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  report: ScanResponse;
}

const saveReport = async (input: SaveReportInput): Promise<void> => {
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });
  await fileSystemService.writeJsonFile({
    filePath: input.report.reportPath,
    data: input.report,
  });
  await fileSystemService.writeJsonFile({
    filePath: path.join(paths.tlxDir, "latest-report.json"),
    data: input.report,
  });
};
const getLatestReport = async (cwd: string): Promise<ScanResponse | null> => {
  const paths = pathService.resolveProjectPaths({ cwd });
  return await fileSystemService.readJsonFile({
    filePath: path.join(paths.tlxDir, "latest-report.json"),
  });
};

export const scanRepository = {
  saveReport,
  getLatestReport,
};
