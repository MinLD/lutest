import path from "node:path";

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

const resolveProjectPaths = (input: ResolveInput): ProjectPaths => {
  const rawRoot = input.projectPath || input.envProjectPath || input.cwd;
  const targetProjectRoot = normalizePath(path.resolve(rawRoot));
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

export const pathService = {
  resolveProjectPaths,
};
