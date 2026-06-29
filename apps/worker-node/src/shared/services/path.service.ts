import fs from "node:fs/promises";
import path from "node:path";
import { HttpError } from "../errors/http-error";

export interface ProjectPaths {
  workerRoot: string;
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

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const resolveRealDirectory = async (value: string): Promise<string> => {
  let realPath: string;

  try {
    realPath = await fs.realpath(value);
  } catch {
    throw new HttpError(
      400,
      "PATH_NOT_ALLOWED",
      `Project path does not exist: ${value}`,
    );
  }

  const stat = await fs.stat(realPath);
  if (!stat.isDirectory()) {
    throw new HttpError(
      400,
      "PATH_NOT_ALLOWED",
      `Project path is not a directory: ${value}`,
    );
  }

  return realPath;
};

const assertLocalAbsolutePath = (value: string): void => {
  if (!path.isAbsolute(value)) {
    throw new HttpError(
      400,
      "PATH_NOT_ALLOWED",
      "Project path must be absolute",
    );
  }

  // ponytail: Windows-only UNC block. Upgrade when remote workspaces needed.
  if (value.startsWith("\\\\")) {
    throw new HttpError(
      400,
      "PATH_NOT_ALLOWED",
      "Network paths are not allowed",
    );
  }
};

const isSubPath = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const getRawRoot = (input: ResolveInput): string =>
  input.projectPath ?? input.envProjectPath ?? input.cwd;

const getAllowedRoots = async (workerRoot: string): Promise<string[]> => {
  const configuredRoots = (process.env.LUTEST_ALLOWED_ROOTS ?? "")
    .split(path.delimiter)
    .filter(Boolean);

  const realConfiguredRoots = await Promise.all(
    configuredRoots.map((root) => resolveRealDirectory(root)),
  );

  return [workerRoot, ...realConfiguredRoots];
};

const assertAllowedRoot = (
  allowedRoots: readonly string[],
  targetProjectRoot: string,
): void => {
  if (allowedRoots.some((root) => isSubPath(root, targetProjectRoot))) return;

  throw new HttpError(
    400,
    "PATH_NOT_ALLOWED",
    "Project path must stay inside allowed roots",
    {
      allowedRoots: allowedRoots.map(normalizePath),
      targetProjectRoot: normalizePath(targetProjectRoot),
    },
  );
};

const buildProjectPaths = (
  workerRoot: string,
  targetProjectRoot: string,
): ProjectPaths => {
  const lutestDir = path.join(targetProjectRoot, ".lutest");

  return {
    workerRoot: normalizePath(workerRoot),
    targetProjectRoot: normalizePath(targetProjectRoot),
    lutestDir: normalizePath(lutestDir),
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

const resolveProjectPaths = async (
  input: ResolveInput,
): Promise<ProjectPaths> => {
  const workerRoot = await resolveRealDirectory(input.cwd);
  const rawRoot = getRawRoot(input);

  assertLocalAbsolutePath(rawRoot);

  const targetProjectRoot = await resolveRealDirectory(rawRoot);

  return buildProjectPaths(workerRoot, targetProjectRoot);
};

const resolveProjectPathsStrict = async (input: ResolveInput) => {
  const paths = await resolveProjectPaths(input);

  return {
    targetProjectRoot: paths.targetProjectRoot,
  };
};

export const pathService = {
  resolveProjectPaths,
  resolveProjectPathsStrict,
};
