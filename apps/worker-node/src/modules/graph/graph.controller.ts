import type { Request, Response } from "express";
import type { GraphResponse } from "@lutest/contracts";
import { graphService } from "./graph.service";

export const graphController = {
  async getGraph(req: Request, res: Response<GraphResponse>): Promise<void> {
    const projectPath =
      typeof req.query.path === "string" ? req.query.path : undefined;

    const graph = await graphService.getGraph({
      cwd: process.cwd(),
      projectPath,
      envProjectPath: process.env.PROJECT_PATH,
    });

    res.json(graph);
  },
};
