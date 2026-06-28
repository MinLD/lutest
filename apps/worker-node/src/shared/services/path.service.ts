import path from "node:path";
import fs from "node:fs/promises";
export interface ProjectPaths {
  targetProjectRoot: string;
  lutestDir: string;
  graphDir: string;
  screenshotsDir: string;
  authDir: string;
  latestReportPath: string;
  latestGraphPath: string;
  hashPath: string;
  authStorageStatePath: string;
  reportDir: string;
}

export interface ResolveInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const normalizePath = (value: string): string => {
  return value.replaceAll("\\", "/");
};
const assertProjectDirectory = async (
  targetProjectRoot: string,
): Promise<void> => {
  let stat;
  try {
    stat = await fs.stat(targetProjectRoot);
  } catch {
    throw new Error(`PROJECT_NOT_FOUND:${targetProjectRoot}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`PROJECT_NOT_DIRECTORY:${targetProjectRoot}`);
  }
};

const resolveProjectPaths = async (
  input: ResolveInput,
): Promise<ProjectPaths> => {
  const rawRoot = input.projectPath || input.envProjectPath || input.cwd;
  const targetProjectRoot = normalizePath(path.resolve(rawRoot));
  await assertProjectDirectory(targetProjectRoot);
  const lutestDir = normalizePath(path.join(targetProjectRoot, ".lutest"));
  return {
    targetProjectRoot,
    lutestDir,
    graphDir: normalizePath(path.join(lutestDir, "graph")),
    screenshotsDir: normalizePath(path.join(lutestDir, "screenshots")),
    authDir: normalizePath(path.join(lutestDir, "auth")),
    reportDir: normalizePath(path.join(lutestDir, "reports")),
    latestReportPath: normalizePath(path.join(lutestDir, "latest-report.json")),
    latestGraphPath: normalizePath(
      path.join(lutestDir, "graph", "latest-graph.json"),
    ),
    hashPath: normalizePath(path.join(lutestDir, "hash.json")),
    authStorageStatePath: normalizePath(
      path.join(lutestDir, "auth", "storage-state.json"),
    ),
  };
};
const resolveProjectPathsStrict = async (input: {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}) => {
  const rawRoot = input.projectPath || input.envProjectPath || input.cwd;
  const targetProjectRoot = path.resolve(input.cwd, rawRoot);

  await assertProjectDirectory(targetProjectRoot);

  return {
    targetProjectRoot,
  };
};
export const pathService = {
  resolveProjectPaths,
  resolveProjectPathsStrict,
};
