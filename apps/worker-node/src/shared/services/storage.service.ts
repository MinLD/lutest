import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectPaths } from "./path.service";
export type ReadJsonResult<T> =
  | { status: "ok"; data: T }
  | { status: "missing"; message: string }
  | { status: "malformed"; message: string }
  | { status: "permission"; message: string }
  | { status: "unknown"; message: string };

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

const ensureProjectStorage = async (paths: ProjectPaths): Promise<void> => {
  await Promise.all([
    ensureDir(paths.lutestDir),
    ensureDir(paths.graphDir),
    ensureDir(paths.screenshotsDir),
    ensureDir(paths.authDir),
    ensureDir(paths.reportDir),
  ]);
};

const writeJson = async (filePath: string, data: unknown): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  const result = await readJsonResult<T>(filePath);
  return result.status === "ok" ? result.data : null;
};

const readJsonResult = async <T>(
  filePath: string,
): Promise<ReadJsonResult<T>> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return { status: "ok", data: JSON.parse(raw) as T };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { status: "malformed", message: error.message };
    }

    if (isNodeError(error) && error.code === "ENOENT") {
      return { status: "missing", message: `File not found: ${filePath}` };
    }

    if (
      isNodeError(error) &&
      (error.code === "EACCES" || error.code === "EPERM")
    ) {
      return { status: "permission", message: String(error) };
    }

    return { status: "unknown", message: String(error) };
  }
};
const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;
export const storageService = {
  ensureDir,
  ensureProjectStorage,
  writeJson,
  readJson,
  readJsonResult,
};
