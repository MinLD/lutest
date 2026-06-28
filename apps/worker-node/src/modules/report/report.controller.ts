import type { Request, Response, NextFunction } from "express";
import type { LatestReportResponse } from "@lutest/contracts";
import { reportService } from "./report.service";
import { validateProjectPathQuery } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";

export const reportController = {
  async getLatestReport(
    req: Request,
    res: Response<LatestReportResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validation = validateProjectPathQuery(req.query.path);
      if (!validation.ok) {
        throw new HttpError(400, validation.code, validation.message);
      }

      const latestReport = await reportService.getLatestReport({
        cwd: process.cwd(),
        projectPath: validation.value,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });

      res.json(latestReport);
    } catch (error) {
      next(error);
    }
  },
};
