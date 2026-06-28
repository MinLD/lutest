import type { Request, Response, NextFunction } from "express";
import type { GraphResponse } from "@lutest/contracts";
import { graphService } from "./graph.service";
import { validateProjectPathQuery } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";
import { pathService } from "../../shared/services/path.service";

export const graphController = {
  async getGraph(
    req: Request,
    res: Response<GraphResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validation = validateProjectPathQuery(req.query.path);
      if (!validation.ok) {
        throw new HttpError(400, validation.code, validation.message);
      }
      const cwd = process.cwd();
      const paths = await pathService.resolveProjectPaths({
        cwd,
        projectPath: validation.value,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });
      const graph = await graphService.buildAndSaveGraph({
        cwd,
        rootDir: paths.targetProjectRoot,
        projectPath: validation.value,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });

      res.json(graph);
    } catch (error) {
      next(error);
    }
  },
};
