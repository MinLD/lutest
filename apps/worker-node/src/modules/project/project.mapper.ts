import path from "node:path";
import type { DetectedFramework, ProjectSummary } from "@lutest/contracts";
import type { PackageJsonData } from "./project.repository";
import type { ProjectPaths } from "../../shared/services/path.service";

export const determineFramework = (
  dependencies: Record<string, string>,
): DetectedFramework => {
  if (dependencies["next"]) return "next";
  if (dependencies["vite"] && dependencies["react"]) return "vite-react";
  if (dependencies["react"]) return "react";
  if (dependencies["vue"]) return "vue";
  return "unknown";
};

const toProjectSummary = (input: {
  paths: ProjectPaths;
  packageJson: PackageJsonData | null;
  packageJsonExists: boolean;
}): ProjectSummary => {
  const deps = {
    ...(input.packageJson?.dependencies || {}),
    ...(input.packageJson?.devDependencies || {}),
  };
  return {
    name:
      typeof input.packageJson?.name === "string"
        ? input.packageJson.name
        : path.basename(input.paths.targetProjectRoot),
    rootDir: input.paths.targetProjectRoot,
    lutestDir: input.paths.lutestDir,
    packageJsonExists: input.packageJsonExists,
    detectedFramework: determineFramework(deps),
  };
};

export const projectMapper = {
  toProjectSummary,
};
