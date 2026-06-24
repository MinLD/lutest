import type { ScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";

export interface SaveReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  report: ScanResponse;
}

// CHANGED: thêm input object cho getLatestReport để đồng bộ với pathService.
// DELETED: bỏ kiểu cũ getLatestReport(cwd: string) vì không truyền được projectPath/envProjectPath.
export interface GetLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const saveReport = async (input: SaveReportInput): Promise<void> => {
  const paths = pathService.resolveProjectPaths({
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
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  // CHANGED: đọc latest report đúng path `.lutest/latest-report.json`.
  // DELETED: bỏ lỗi đọc nhầm `paths.latestGraphPath`.
  // DELETED: bỏ unused imports `path` và `fileSystemService`.
  return storageService.readJson<ScanResponse>(paths.latestReportPath);
};

export const scanRepository = {
  saveReport,
  getLatestReport,
};