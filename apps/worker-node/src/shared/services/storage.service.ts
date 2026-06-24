import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectPaths } from "./path.service";

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
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};
export const storageService = {
  ensureDir,
  ensureProjectStorage,
  writeJson,
  readJson,
};
