import type { Request, Response } from "express";
import type { ProjectSummary } from "@lutest/contracts";
import { projectService } from "./project.service";

export const projectController = {
  async getProject(req: Request, res: Response<ProjectSummary>): Promise<void> {
    const projectPath =
      typeof req.query.path === "string" ? req.query.path : undefined;

    const project = await projectService.getProjectSummary({
      cwd: process.cwd(),
      projectPath,
      envProjectPath: process.env.PROJECT_PATH,
    });
    res.json(project);
  },
};
