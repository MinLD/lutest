import type { ProjectSummary } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { projectMapper } from "./project.mapper";
import { projectRepository } from "./project.repository";

export interface GetProjectSummaryInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export const projectService = {
  async getProjectSummary(
    input: GetProjectSummaryInput,
  ): Promise<ProjectSummary> {
    const paths = pathService.resolveProjectPaths({
      cwd: input.cwd,
      projectPath: input.projectPath,
      envProjectPath: input.envProjectPath,
    });
    const [packageJsonExists, packageJson] = await Promise.all([
      projectRepository.packageJsonExists(paths.targetProjectRoot),
      projectRepository.readPackageJson(paths.targetProjectRoot),
    ]);
    return projectMapper.toProjectSummary({
      paths,
      packageJson,
      packageJsonExists,
    });
  },
};
