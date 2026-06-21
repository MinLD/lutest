import type { Request, Response } from "express";
import type { LatestReportResponse } from "@lutest/contracts";
import { reportService } from "./report.service";

export const reportController = {
  async getLatestReport(
    req: Request,
    res: Response<LatestReportResponse>,
  ): Promise<void> {
    const projectPath =
      typeof req.query.path === "string" ? req.query.path : undefined;

    const latestReport = await reportService.getLatestReport({
      cwd: process.cwd(),
      projectPath,
      envProjectPath: process.env.PROJECT_PATH,
    });

    res.json(latestReport);
  },
};
