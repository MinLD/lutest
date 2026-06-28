import type { Request, Response, NextFunction } from "express";
import type { ProjectSummary } from "@lutest/contracts";
import { projectService } from "./project.service";
import { validateProjectPathQuery } from "@lutest/contracts";
import { HttpError } from "../../shared/errors/http-error";

export const projectController = {
  async getProject(
    req: Request,
    res: Response<ProjectSummary>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validation = validateProjectPathQuery(req.query.path);
      if (!validation.ok) {
        throw new HttpError(400, validation.code, validation.message);
      }

      const project = await projectService.getProjectSummary({
        cwd: process.cwd(),
        projectPath: validation.value,
        envProjectPath: process.env.LUTEST_PROJECT_PATH,
      });
      res.json(project);
    } catch (error) {
      next(error);
    }
  },
};
