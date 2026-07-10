import type { NextFunction, Request, Response } from "express";
import {
  validateLatestReportQuery,
  validateRuntimeArtifactDetailQuery,
  validateRuntimeArtifactScreenshotQuery,
} from "@lutest/contracts";
import { reportService } from "./report.service";
import { getValidatedProjectPath } from "../../shared/http/validated-project-path";
import { pathPolicyService } from "../../shared/services/path-policy.service";
import { sendPathError, sendValidationError } from "../../shared/http/respond";
import { runtimeArtifactDetailService } from "./runtime-artifact-detail.service";

const getLatestReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projectPath = await getValidatedProjectPath(
      req,
      res,
      validateLatestReportQuery,
    );
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

const getLatestRuntimeArtifact = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projectPath = await getValidatedProjectPath(req, res, validateRuntimeArtifactDetailQuery);
    if (projectPath === null) return;
    res.json(await runtimeArtifactDetailService.getLatestDetail(projectPath));
  } catch (error) {
    next(error);
  }
};

const getRuntimeScreenshot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validation = validateRuntimeArtifactScreenshotQuery(req.query);
    if (!validation.ok) {
      sendValidationError(res, validation);
      return;
    }
    const policy = await pathPolicyService.assertProjectRoot(validation.value.path ?? validation.value.projectPath);
    if (!policy.ok) {
      sendPathError(res, policy.message);
      return;
    }
    const screenshot = await runtimeArtifactDetailService.getScreenshot(policy.rootDir, validation.value.ref);
    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(screenshot);
  } catch (error) {
    next(error);
  }
};

export const reportController = { getLatestReport, getLatestRuntimeArtifact, getRuntimeScreenshot };
