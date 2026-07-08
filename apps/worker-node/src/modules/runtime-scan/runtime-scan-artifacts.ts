import fs from "node:fs/promises";
import path from "node:path";
import { resolveRuntimeArtifactRepositoryPaths } from "./runtime-scan-artifact-contract";
import { validateRuntimeScanResult, type RuntimeScanResult } from "./runtime-scan.schema";

export type RuntimeScanArtifactMetaFile = {
  schemaVersion: RuntimeScanResult["schemaVersion"];
  scanId: string;
  generatedAt: string;
  selectedRoot: string;
  projectRoot: string;
  latestPath: string;
  snapshotPath?: string;
  targetCount: number;
  errorCount: number;
};

export type SaveRuntimeScanOptions = { writeSnapshot?: boolean };

export class RuntimeScanArtifactError extends Error {
  readonly code: "RUNTIME_SCAN_ARTIFACT_INVALID" | "RUNTIME_SCAN_ARTIFACT_IO";

  constructor(code: RuntimeScanArtifactError["code"], message: string) {
    super(message);
    this.name = "RuntimeScanArtifactError";
    this.code = code;
  }
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const isNotFound = (error: unknown): boolean => error instanceof Error && "code" in error && error.code === "ENOENT";

const validatePersisted = async (filePath: string): Promise<void> => {
  try {
    validateRuntimeScanResult(JSON.parse(await fs.readFile(filePath, "utf-8")));
  } catch (error) {
    throw new RuntimeScanArtifactError(
      "RUNTIME_SCAN_ARTIFACT_INVALID",
      error instanceof Error ? `Runtime scan persisted artifact invalid: ${error.message}` : "Runtime scan persisted artifact invalid",
    );
  }
};

const assertInside = (projectRoot: string, candidate: string): string => {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_INVALID", "Runtime scan artifact path must stay inside project root");
  }
  return resolved;
};

const assertSafeScanId = (scanId: string): void => {
  if (!/^[a-zA-Z0-9._-]+$/.test(scanId)) {
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_INVALID", "Runtime scan artifact scanId must be path-safe");
  }
};

export const runtimeScanArtifactPaths = (input: { projectRoot: string; scanId: string }) => {
  assertSafeScanId(input.scanId);
  const projectRoot = path.resolve(input.projectRoot);
  const paths = resolveRuntimeArtifactRepositoryPaths({ projectRoot, scanId: input.scanId });
  for (const candidate of Object.values(paths)) assertInside(projectRoot, candidate);
  return paths;
};

export const saveLatestRuntimeScan = async (
  result: RuntimeScanResult,
  options: SaveRuntimeScanOptions = {},
) => {
  const artifact = validateRuntimeScanResult(result);
  const paths = runtimeScanArtifactPaths({ projectRoot: artifact.projectRoot, scanId: artifact.scanId });
  const snapshotPath = options.writeSnapshot === false ? undefined : paths.snapshotPath;
  const meta: RuntimeScanArtifactMetaFile = {
    schemaVersion: artifact.schemaVersion,
    scanId: artifact.scanId,
    generatedAt: artifact.generatedAt,
    selectedRoot: path.resolve(artifact.selectedRoot),
    projectRoot: path.resolve(artifact.projectRoot),
    latestPath: paths.latestResultPath,
    snapshotPath,
    targetCount: artifact.targets.length,
    errorCount: artifact.errors.length,
  };

  await fs.mkdir(paths.rootDir, { recursive: true });
  if (snapshotPath) await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(paths.latestResultPath, stableJson({ ...artifact, artifacts: { ...artifact.artifacts, resultPath: paths.latestResultPath } }), "utf-8");
  await fs.writeFile(paths.metaPath, stableJson(meta), "utf-8");
  if (snapshotPath) await fs.writeFile(snapshotPath, stableJson({ ...artifact, artifacts: { ...artifact.artifacts, resultPath: snapshotPath } }), "utf-8");
  await validatePersisted(paths.latestResultPath);
  if (snapshotPath) await validatePersisted(snapshotPath);
  return { paths, meta };
};

export const saveRuntimeScanSnapshot = async (result: RuntimeScanResult) => saveLatestRuntimeScan(result, { writeSnapshot: true });

export const readLatestRuntimeScan = async (projectRoot: string): Promise<RuntimeScanResult | null> => {
  const paths = runtimeScanArtifactPaths({ projectRoot, scanId: "latest" });
  let raw: string;
  try {
    raw = await fs.readFile(paths.latestResultPath, "utf-8");
  } catch (error) {
    if (isNotFound(error)) return null;
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_IO", "Runtime scan latest artifact could not be read");
  }
  try {
    return validateRuntimeScanResult(JSON.parse(raw));
  } catch (error) {
    throw new RuntimeScanArtifactError(
      "RUNTIME_SCAN_ARTIFACT_INVALID",
      error instanceof Error ? `Runtime scan latest artifact invalid: ${error.message}` : "Runtime scan latest artifact invalid",
    );
  }
};
