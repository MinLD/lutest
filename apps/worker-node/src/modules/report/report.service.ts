import type { LatestReportResponse } from "@lutest/contracts";
import { reportRepository } from "./report.repository";

export interface GetLatestReportInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const getLatestReport = async (
  input: GetLatestReportInput,
): Promise<LatestReportResponse> => {
  const report = await reportRepository.findLatest(input);
  return { report };
};

export const reportService = { getLatestReport };
