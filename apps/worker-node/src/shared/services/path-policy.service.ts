import fs from "node:fs/promises";
import path from "node:path";

export type PathPolicyConfig = {
  allowedRoot: string;
};

export type PathPolicyResult =
  | { ok: true; rootDir: string; allowedRoot: string }
  | { ok: false; code: "PATH_NOT_ALLOWED"; message: string; details?: unknown };

const blockedSegments = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".lutest",
]);

const normalizePath = (value: string): string => path.normalize(value);

const toDisplayPath = (value: string): string => value.replaceAll("\\", "/");

const isSubPath = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const hasBlockedSegment = (targetPath: string): boolean =>
  targetPath
    .split(path.sep)
    .filter(Boolean)
    .some((segment) => blockedSegments.has(segment));

const configuredAllowedRoot = (env: NodeJS.ProcessEnv = process.env): string =>
  env.LUTEST_PROJECT_PATH ?? env.PROJECT_PATH ?? process.cwd();

const getPathPolicyConfig = (
  env: NodeJS.ProcessEnv = process.env,
): PathPolicyConfig => ({
  allowedRoot: configuredAllowedRoot(env),
});

const resolveRealDirectory = async (
  rawPath: string,
): Promise<PathPolicyResult> => {
  if (!path.isAbsolute(rawPath)) {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path must be absolute",
    };
  }

  if (rawPath.startsWith("\\\\")) {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Network paths are not allowed",
    };
  }

  let rootDir: string;
  try {
    rootDir = await fs.realpath(normalizePath(rawPath));
  } catch {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path does not exist",
    };
  }

  const stat = await fs.stat(rootDir);
  if (!stat.isDirectory()) {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path must be a directory",
    };
  }

  return { ok: true, rootDir, allowedRoot: rootDir };
};

const assertProjectRoot = async (
  rawPath?: string,
  config: PathPolicyConfig = getPathPolicyConfig(),
): Promise<PathPolicyResult> => {
  const allowed = await resolveRealDirectory(config.allowedRoot);
  if (!allowed.ok) return allowed;

  const target = await resolveRealDirectory(rawPath ?? allowed.rootDir);
  if (!target.ok) return target;

  // if (hasBlockedSegment(target.rootDir)) {
  //   return {
  //     ok: false,
  //     code: "PATH_NOT_ALLOWED",
  //     message: "Project path points to ignored/generated directory",
  //   };
  // }

  // if (!isSubPath(allowed.rootDir, target.rootDir)) {
  //   return {
  //     ok: false,
  //     code: "PATH_NOT_ALLOWED",
  //     message: "Project path must stay inside allowed root",
  //     details: {
  //       allowedRoot: toDisplayPath(allowed.rootDir),
  //       targetRoot: toDisplayPath(target.rootDir),
  //     },
  //   };
  // }

  return {
    ok: true,
    rootDir: target.rootDir,
    allowedRoot: allowed.rootDir,
  };
};

export const pathPolicyService = {
  assertProjectRoot,
  getPathPolicyConfig,
};
