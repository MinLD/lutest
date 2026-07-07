import type { Request, Response, NextFunction } from "express";
import {
  validateGraphQuery,
  validateProductionGraphResponse,
  type GraphResponse,
  type ProductionGraphResponse,
} from "@lutest/contracts";
import { graphService } from "./graph.service";
import { saveLatestProductionGraph } from "./production/production-graph-artifacts";
import { buildProductionGraph } from "./production/production-graph-builder";
import { pathService } from "../../shared/services/path.service";
import { getValidatedProjectPath } from "../../shared/http/validated-project-path";
import { HttpError } from "../../shared/errors/http-error";

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

  async getProductionGraph(
    req: Request,
    res: Response<ProductionGraphResponse>,
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

      const graph = await buildProductionGraph({ rootDir: paths.targetProjectRoot });
      const validation = validateProductionGraphResponse(graph);
      if (!validation.ok) {
        throw new HttpError(500, "INTERNAL_ERROR", validation.message, validation.details);
      }

      await saveLatestProductionGraph({
        projectRoot: paths.targetProjectRoot,
        graph: validation.value,
      });

      res.json(validation.value);
    } catch (error) {
      next(error);
    }
  },
};
