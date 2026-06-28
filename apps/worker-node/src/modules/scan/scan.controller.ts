import type { Request, Response, NextFunction } from "express";
import type { ScanRequest, ScanResponse } from "@lutest/contracts";
import { scanService } from "./scan.service";
import { validateScanRequest } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
export const scanController = {
  async runScan(
    req: Request<unknown, ScanResponse, ScanRequest>,
    res: Response<ScanResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validation = validateScanRequest(req.body);
      if (!validation.ok) {
        throw new HttpError(400, validation.code, validation.message);
      }

      const scan = await scanService.runScan({
        cwd: process.cwd(),
        projectPath: validation.value.projectPath,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });

      res.json(scan);
    } catch (error) {
      next(error);
    }
  },
};
