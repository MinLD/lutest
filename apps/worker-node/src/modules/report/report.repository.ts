import type { ScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";
import type { ReadJsonResult } from "../../shared/services/storage.service";

export interface FindLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const findLatest = async (
  input: FindLatestReportInput,
): Promise<ReadJsonResult<ScanResponse>> => {
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  const result = await storageService.readJsonResult<ScanResponse>(
    (await paths).latestReportPath,
  );
  if (result.status !== "ok") return result;
  return result;
};

export const reportRepository = { findLatest };
