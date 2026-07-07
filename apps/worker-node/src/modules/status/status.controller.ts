import type { Request, Response } from "express";
import type { StatusResponse } from "@lutest/contracts";
export const statusController = {
  async getStatus(_req: Request, res: Response<StatusResponse>): Promise<void> {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      service: "lutest-worker",
      runtime: "node",
      env: process.env.LUTEST_ENV ?? "development",
    });
  },
};
