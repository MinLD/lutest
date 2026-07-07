import type { NextFunction, Request, Response } from "express";
import {
  ScanRequest,
  ScanResponse,
  validateScanRequest,
} from "@lutest/contracts";
import { scanService } from "./scan.service";
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
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
