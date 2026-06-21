import path from "node:path";
import type { DetectedFramework, ProjectSummary } from "@lutest/contracts";
import type { PackageJsonData } from "./project.repository";
import type { ProjectPaths } from "../../shared/services/path.service";

const detectFramework = (
  packageJson: PackageJsonData | null,
): DetectedFramework => {
  if (!packageJson) return "unknown";
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  if (deps.next) return "next";
  if (deps.vite && deps.react) return "vite-react";
  if (deps.react) return "react";
  if (deps.vue) return "vue";
  return "unknown";
};

const toProjectSummary = (input: {
  paths: ProjectPaths;
  packageJson: PackageJsonData | null;
  packageJsonExists: boolean;
}): ProjectSummary => {
  return {
    name:
      typeof input.packageJson?.name === "string"
        ? input.packageJson.name
        : path.basename(input.paths.targetProjectRoot),
    rootDir: input.paths.targetProjectRoot,
    tlxDir: input.paths.tlxDir,
    packageJsonExists: input.packageJsonExists,
    detectedFramework: detectFramework(input.packageJson),
  };
};

export const projectMapper = {
  toProjectSummary,
};
