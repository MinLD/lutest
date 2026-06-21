import type { LatestReportResponse } from "@lutest/contracts";
import { reportRepository } from "./report.repository";

export const reportService = {
  async getLatestReport(): Promise<LatestReportResponse> {
    const report = await reportRepository.findLatest();

    return {
      report,
    };
  },
};
