import type { Request, Response, NextFunction } from "express";
import { validateGraphQuery, type GraphResponse } from "@lutest/contracts";
import { graphService } from "./graph.service";
import { pathService } from "../../shared/services/path.service";
import { getValidatedProjectPath } from "../../shared/http/validated-project-path";

export const graphController = {
  async getGraph(
    req: Request,
    res: Response<GraphResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const projectPath = await getValidatedProjectPath(req, res, validateGraphQuery);
      if (projectPath === null) return;

      const paths = await pathService.resolveProjectPaths({
        cwd: process.cwd(),
        projectPath,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });

      const result = await graphService.buildAndSaveGraph({
        rootDir: paths.targetProjectRoot,
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
