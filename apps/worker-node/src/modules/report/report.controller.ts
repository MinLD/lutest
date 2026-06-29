import type { NextFunction, Request, Response } from "express";
import { reportService } from "./report.service";
import { getValidatedProjectPath } from "../../shared/http/validated-project-path";

const getLatestReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projectPath = await getValidatedProjectPath(req, res);
    if (projectPath === null) return;

    const result = await reportService.getLatestReport({
      cwd: process.cwd(),
      projectPath,
      envProjectPath: process.env.LUTEST_PROJECT_PATH,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const reportController = { getLatestReport };
