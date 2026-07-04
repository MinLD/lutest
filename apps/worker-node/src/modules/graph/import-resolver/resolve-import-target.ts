import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedImport, TsconfigPathSettings } from "./import-resolver.types";
import { readTsconfigPathSettings } from "./tsconfig-paths";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const isRelativeSpecifier = (specifier: string): boolean =>
  specifier.startsWith("./") || specifier.startsWith("../");

const isSourceExtension = (filePath: string): boolean =>
  SOURCE_EXTENSIONS.some((extension) => filePath.endsWith(extension));

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
};

const candidatePaths = (rawPath: string): string[] => {
  const extension = path.extname(rawPath);
  const candidates = [rawPath];
  if (!extension) {
    candidates.push(...SOURCE_EXTENSIONS.map((sourceExtension) => `${rawPath}${sourceExtension}`));
    candidates.push(
      ...SOURCE_EXTENSIONS.map((sourceExtension) =>
        path.join(rawPath, `index${sourceExtension}`),
      ),
    );
  }
  return candidates;
};

const resolveExistingSource = async (rawPath: string): Promise<string | null> => {
  for (const candidate of candidatePaths(rawPath)) {
    if (await fileExists(candidate)) {
      return isSourceExtension(candidate) ? normalizePath(candidate) : null;
    }
  }
  return null;
};

const wildcardMatch = (pattern: string, specifier: string): string | null => {
  const starIndex = pattern.indexOf("*");
  if (starIndex === -1) return pattern === specifier ? "" : null;
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return null;
  return specifier.slice(prefix.length, specifier.length - suffix.length);
};

const applyPaths = (
  specifier: string,
  settings: TsconfigPathSettings,
): string[] => {
  const baseUrl = settings.baseUrl;
  if (!baseUrl) return [];
  const candidates: string[] = [];
  for (const entry of settings.paths) {
    const match = wildcardMatch(entry.pattern, specifier);
    if (match === null) continue;
    for (const target of entry.targets) {
      candidates.push(path.resolve(baseUrl, target.replace("*", match)));
    }
  }
  return candidates;
};

const unresolved = (input: {
  sourceFilePath: string;
  specifier: string;
  reason: string;
  confidence?: ResolvedImport["confidence"];
}): ResolvedImport => ({
  sourceFilePath: normalizePath(input.sourceFilePath),
  specifier: input.specifier,
  targetFilePath: null,
  resolved: false,
  reason: input.reason,
  confidence: input.confidence ?? "low",
});

export const resolveImportTarget = async (input: {
  projectRoot: string;
  sourceFilePath: string;
  specifier: string;
  tsconfig?: TsconfigPathSettings;
}): Promise<ResolvedImport> => {
  const settings = input.tsconfig ?? (await readTsconfigPathSettings(input.projectRoot));
  const sourceFilePath = path.resolve(input.projectRoot, input.sourceFilePath);

  if (settings.diagnostics.length > 0) {
    return unresolved({
      sourceFilePath: input.sourceFilePath,
      specifier: input.specifier,
      reason: "config-invalid",
      confidence: "low",
    });
  }

  if (isRelativeSpecifier(input.specifier)) {
    const rawTarget = path.resolve(path.dirname(sourceFilePath), input.specifier);
    const target = await resolveExistingSource(rawTarget);
    return target
      ? {
          sourceFilePath: normalizePath(input.sourceFilePath),
          specifier: input.specifier,
          targetFilePath: normalizePath(path.relative(input.projectRoot, target)),
          resolved: true,
          reason: "relative-match",
          confidence: "high",
        }
      : unresolved({ sourceFilePath: input.sourceFilePath, specifier: input.specifier, reason: "target-not-found" });
  }

  for (const rawTarget of applyPaths(input.specifier, settings)) {
    const target = await resolveExistingSource(rawTarget);
    if (target) {
      return {
        sourceFilePath: normalizePath(input.sourceFilePath),
        specifier: input.specifier,
        targetFilePath: normalizePath(path.relative(input.projectRoot, target)),
        resolved: true,
        reason: "paths-match",
        confidence: "high",
      };
    }
  }

  if (settings.baseUrl) {
    const target = await resolveExistingSource(path.resolve(settings.baseUrl, input.specifier));
    if (target) {
      return {
        sourceFilePath: normalizePath(input.sourceFilePath),
        specifier: input.specifier,
        targetFilePath: normalizePath(path.relative(input.projectRoot, target)),
        resolved: true,
        reason: "base-url-match",
        confidence: "medium",
      };
    }
  }

  return /^[a-zA-Z@][^:]*$/.test(input.specifier)
    ? unresolved({ sourceFilePath: input.sourceFilePath, specifier: input.specifier, reason: "external-package" })
    : unresolved({ sourceFilePath: input.sourceFilePath, specifier: input.specifier, reason: "target-not-found" });
};
