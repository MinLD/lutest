import fs from "node:fs/promises";
import path from "node:path";
export type PathPolicyResult =
  | { ok: true; rootDir: string }
  | { ok: false; code: "PATH_NOT_ALLOWED"; message: string };
const blockedSegments = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
]);

const hasBlockedSegment = (targetPath: string): boolean =>
  targetPath
    .split(path.sep)
    .filter(Boolean)
    .some((segment) => blockedSegments.has(segment));

const assertProjectRoot = async (
  rawPath: string,
): Promise<PathPolicyResult> => {
  const rootDir = path.resolve(rawPath);

  if (hasBlockedSegment(rootDir)) {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path points to ignored/generated directory",
    };
  }

  let stat;
  try {
    stat = await fs.stat(rootDir);
  } catch {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path does not exist",
    };
  }

  if (!stat.isDirectory()) {
    return {
      ok: false,
      code: "PATH_NOT_ALLOWED",
      message: "Project path must be a directory",
    };
  }

  return { ok: true, rootDir };
};

export const pathPolicyService = {
  assertProjectRoot,
};
