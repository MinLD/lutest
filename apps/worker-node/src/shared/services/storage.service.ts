import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectPaths } from "./path.service";

export type JsonReadResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "missing"; error: string }
  | { kind: "malformed"; error: string }
  | { kind: "permission-denied"; error: string }
  | { kind: "unknown-error"; error: string };

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
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  const result = await readJsonResult<T>(filePath);
  return result.kind === "ok" ? result.data : null;
};

const readJsonResult = async <T>(
  filePath: string,
): Promise<JsonReadResult<T>> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return { kind: "ok", data: JSON.parse(raw) as T };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "malformed", error: error.message };
    }

    if (isNodeError(error) && error.code === "ENOENT") {
      return { kind: "missing", error: `File not found: ${filePath}` };
    }

    if (
      isNodeError(error) &&
      (error.code === "EACCES" || error.code === "EPERM")
    ) {
      return { kind: "permission-denied", error: String(error) };
    }

    return { kind: "unknown-error", error: String(error) };
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
