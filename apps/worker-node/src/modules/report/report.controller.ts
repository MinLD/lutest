import type { Request, Response } from "express";
import type { LatestReportResponse } from "@lutest/contracts";
import { reportService } from "./report.service";

export const reportController = {
  async getLatestReport(
    _req: Request,
    res: Response<LatestReportResponse>,
  ): Promise<void> {
    const latestReport = await reportService.getLatestReport();
    res.json(latestReport);
  },
};
