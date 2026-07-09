import type { NextFunction, Request, Response } from "express";
import {
  ScanRequest,
  ScanResponse,
  validateScanRequest,
} from "@lutest/contracts";
import { scanService } from "./scan.service";
import { HttpError } from "../../shared/errors/http-error";
import { sendPathError, sendValidationError } from "../../shared/http/respond";
import { pathPolicyService } from "../../shared/services/path-policy.service";

export const scanController = {
  async runScan(
    req: Request<unknown, ScanResponse, ScanRequest>,
    res: Response<ScanResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validation = validateScanRequest(req.body);
      if (!validation.ok) {
        if (validation.message.includes("local HTTP(S) URL")) {
          throw new HttpError(400, "BASE_URL_NOT_LOCAL", validation.message);
        }
        if (req.body && typeof req.body === "object" && "runtimeScan" in req.body) {
          throw new HttpError(400, "CONFIG_ERROR", validation.message, validation.details);
        }
        sendValidationError(res, validation);
        return;
      }

      let projectPath = validation.value.projectPath;
      if (projectPath) {
        const policy = await pathPolicyService.assertProjectRoot(projectPath);
        if (!policy.ok) {
          sendPathError(res, policy.message);
          return;
        }
        projectPath = policy.rootDir;
      }

      const result = await scanService.runScan({
        cwd: process.cwd(),
        projectPath,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
        runtimeScan: validation.value.runtimeScan,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
