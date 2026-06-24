import type { Request, Response } from "express";
import type { GraphResponse } from "@lutest/contracts";
import { graphService } from "./graph.service";
import { pathService } from "../../shared/services/path.service";

export const graphController = {
  async getGraph(req: Request, res: Response<GraphResponse>): Promise<void> {
    const projectPath =
      typeof req.query.path === "string" ? req.query.path : undefined;

    const paths = pathService.resolveProjectPaths({
      cwd: process.cwd(),
      projectPath,
      envProjectPath: process.env.LUTEST_PROJECT_PATH,
    });

    const graph = await graphService.buildGraph({
      rootDir: paths.targetProjectRoot,
    });

    res.json(graph);
  },
};
