import fs from "node:fs/promises";
import path from "node:path";
import { HttpError } from "../errors/http-error";
import { pathPolicyService } from "./path-policy.service";

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

const getRawRoot = (input: ResolveInput): string =>
  input.projectPath ??
  input.envProjectPath ??
  pathPolicyService.getPathPolicyConfig().allowedRoot;

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
  const policy = await pathPolicyService.assertProjectRoot(rawRoot);
  if (!policy.ok) {
    throw new HttpError(400, policy.code, policy.message, policy.details);
  }
  const targetProjectRoot = policy.rootDir;

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
