import type { ProjectSummary } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { projectMapper } from "./project.mapper";
import { projectRepository } from "./project.repository";
import { fileSystemService } from "../../shared/services/file-system.service";

export interface GetProjectSummaryInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}
export interface ProjectDiscoveryInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export interface ProjectDiscoveryResult {
  summary: ProjectSummary;
  sourceFiles: string[];
}

const getProjectSummary = async (
  input: GetProjectSummaryInput,
): Promise<ProjectSummary> => {
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
};
const discoverProject = async (
  input: ProjectDiscoveryInput,
): Promise<ProjectDiscoveryResult> => {
  const summary = await getProjectSummary(input);

  const sourceFiles = await fileSystemService.listFiles({
    rootDir: summary.rootDir,
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    ignoredDirs: ["node_modules", ".git", "dist", "build", ".next", ".tlx"],
  });

  return {
    summary,
    sourceFiles,
  };
};
export const projectService = {
  getProjectSummary,
  discoverProject,
};
