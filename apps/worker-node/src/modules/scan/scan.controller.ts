import type { Request, Response } from "express";
import type { ScanRequest, ScanResponse } from "@lutest/contracts";
import { scanService } from "./scan.service";

export const scanController = {
  async runScan(
    req: Request<unknown, ScanResponse, ScanRequest>,
    res: Response<ScanResponse>,
  ): Promise<void> {
    const scan = await scanService.runScan({
      cwd: process.cwd(),
      projectPath: req.body.projectPath,
      envProjectPath: process.env.PROJECT_PATH,
    });

    res.json(scan);
  },
};
