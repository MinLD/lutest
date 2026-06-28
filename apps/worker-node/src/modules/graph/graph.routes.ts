import { Router } from "express";
import { graphService } from "./graph.service";
import { pathService } from "../../shared/services/path.service";

export const graphRoutes = Router();

graphRoutes.get("/", async (req, res, next) => {
  try {
    const cwd = process.cwd();
    const projectPath =
      typeof req.query.path === "string" ? req.query.path : undefined;

    const paths = await pathService.resolveProjectPaths({
      cwd,
      projectPath,
      envProjectPath: process.env.LUTEST_PROJECT_PATH,
    });

    const graph = await graphService.buildAndSaveGraph({
      cwd,
      rootDir: paths.targetProjectRoot,
      projectPath,
      envProjectPath: process.env.LUTEST_PROJECT_PATH,
    });

    res.json(graph);
  } catch (error) {
    next(error);
  }
});
