import fs from "node:fs/promises";
import path from "node:path";
import type { TsconfigPathSettings } from "./import-resolver.types";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJsonFile = async (filePath: string): Promise<unknown> => {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
};

const findConfigPath = async (projectRoot: string): Promise<string | null> => {
  const candidates = ["tsconfig.json", "jsconfig.json"].map((name) =>
    path.join(projectRoot, name),
  );
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
};

export const readTsconfigPathSettings = async (
  projectRoot: string,
): Promise<TsconfigPathSettings> => {
  const configPath = await findConfigPath(projectRoot);
  if (!configPath) {
    return { configPath: null, baseUrl: null, paths: [], diagnostics: [] };
  }

  try {
    const raw = await readJsonFile(configPath);
    if (!isRecord(raw) || !isRecord(raw.compilerOptions)) {
      return { configPath: normalizePath(configPath), baseUrl: null, paths: [], diagnostics: [] };
    }

    const paths: TsconfigPathSettings["paths"] = [];

    if (isRecord(raw.compilerOptions.paths)) {
      for (const [pattern, targets] of Object.entries(raw.compilerOptions.paths)) {
        if (!Array.isArray(targets)) continue;
        paths.push({
          pattern,
          targets: targets.filter((target): target is string => typeof target === "string"),
        });
      }
    }

    const baseUrl =
      typeof raw.compilerOptions.baseUrl === "string"
        ? normalizePath(path.resolve(projectRoot, raw.compilerOptions.baseUrl))
        : paths.length > 0
          ? normalizePath(projectRoot)
          : null;

    return { configPath: normalizePath(configPath), baseUrl, paths, diagnostics: [] };
  } catch (error) {
    return {
      configPath: normalizePath(configPath),
      baseUrl: null,
      paths: [],
      diagnostics: [`Could not read config: ${String(error)}`],
    };
  }
};
