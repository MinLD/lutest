import fs from "node:fs/promises";
import path from "node:path";
import type { DetectedFramework, ProjectSummary } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { projectMapper } from "./project.mapper";
import { projectRepository } from "./project.repository";
import { fileSystemService } from "../../shared/services/file-system.service";
import { determineFramework } from "./project.mapper";

export interface ProjectDiscoveryInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export interface ProjectDiscoveryResult {
  summary: ProjectSummary;
  sourceFiles: string[];
}

const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const getProjectSummary = async (
  input: ProjectDiscoveryInput,
): Promise<ProjectSummary> => {
  const paths = await pathService.resolveProjectPaths({
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
  const paths = await pathService.resolveProjectPaths(input);
  const rootDir = paths.targetProjectRoot;

  const packageJsonPath = path.join(rootDir, "package.json");
  const packageJsonExists = await checkFileExists(packageJsonPath);

  let framework: DetectedFramework = "unknown";
  let projectName = path.basename(rootDir);

  if (packageJsonExists) {
    try {
      const content = await fs.readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);
      projectName = pkg.name || projectName;

     
      const deps: Record<string, string> = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      framework = determineFramework(deps);
    } catch {}
  }

  if (framework === "unknown") {
    const isArtisan = await checkFileExists(path.join(rootDir, "artisan"));
    const isComposer = await checkFileExists(
      path.join(rootDir, "composer.json"),
    );

    if (isArtisan || isComposer) {
      framework = "laravel";
    } else {
      const isIndexPhp = await checkFileExists(path.join(rootDir, "index.php"));
      if (isIndexPhp) framework = "php";
    }
  }

  const sourceFiles = await fileSystemService.listFiles({
    rootDir,
    extensions: [".ts", ".tsx", ".js", ".jsx", ".php"],
    ignoredDirs: ["node_modules", ".git", "dist", "build", ".next", ".lutest"],
  });

  return {
    summary: {
      name: projectName,
      rootDir,
      lutestDir: paths.lutestDir,
      packageJsonExists,
      detectedFramework: framework,
      sourceFileCount: sourceFiles.length,
    },
    sourceFiles,
  };
};

export const projectService = {
  getProjectSummary,
  discoverProject,
};
