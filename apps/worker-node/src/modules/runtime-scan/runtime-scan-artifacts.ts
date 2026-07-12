import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveRuntimeArtifactRepositoryPaths } from "./runtime-scan-artifact-contract";
import { DEFAULT_RUNTIME_SCAN_LIMITS } from "./runtime-scan-limits";
import { redactRuntimeTextEvidence } from "./runtime-readability-policy";
import { validateRuntimeScanResult, type RuntimeScanResult } from "./runtime-scan.schema";

export type RuntimeScanArtifactMetaFile = {
  schemaVersion: RuntimeScanResult["schemaVersion"];
  artifactVersion: 1;
  scanId: string;
  savedAt: string;
  generatedAt: string;
  targetCount: number;
  viewportCount: number;
  screenshotCount: number;
  issueCount: number;
  errorCount: number;
};

export type SaveRuntimeScanOptions = { writeSnapshot?: boolean };

export class RuntimeScanArtifactError extends Error {
  readonly code:
    | "RUNTIME_SCAN_ARTIFACT_INVALID"
    | "RUNTIME_SCAN_ARTIFACT_MALFORMED"
    | "RUNTIME_SCAN_ARTIFACT_IO";

  constructor(code: RuntimeScanArtifactError["code"], message: string) {
    super(message);
    this.name = "RuntimeScanArtifactError";
    this.code = code;
  }
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const isNotFound = (error: unknown): boolean => error instanceof Error && "code" in error && error.code === "ENOENT";
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeLegacyDomGeometry = (value: unknown): unknown => {
  if (!isRecord(value) || !Array.isArray(value.elements)) return value;
  return {
    ...value,
    elements: value.elements.map((element) => {
      if (!isRecord(element)) return element;
      return {
        ...element,
        textSnippet: typeof element.textSnippet === "string" ? redactRuntimeTextEvidence(element.textSnippet) : element.textSnippet,
        ariaLabel: typeof element.ariaLabel === "string" ? redactRuntimeTextEvidence(element.ariaLabel) : element.ariaLabel,
      };
    }),
  };
};

const sanitizeLegacyRuntimeTextEvidence = (value: unknown): unknown => {
  if (!isRecord(value) || !Array.isArray(value.routes)) return value;
  return {
    ...value,
    routes: value.routes.map((route) => {
      if (!isRecord(route) || !Array.isArray(route.viewportResults)) return route;
      return {
        ...route,
        viewportResults: route.viewportResults.map((viewport) => {
          if (!isRecord(viewport) || viewport.domGeometry === undefined) return viewport;
          return { ...viewport, domGeometry: sanitizeLegacyDomGeometry(viewport.domGeometry) };
        }),
      };
    }),
  };
};

const migrateLegacyRuntimeScanArtifact = (value: unknown): unknown => {
  const sanitized = sanitizeLegacyRuntimeTextEvidence(value);
  if (!isRecord(sanitized) || !isRecord(sanitized.limits)) return sanitized;
  return {
    ...sanitized,
    limits: {
      ...sanitized.limits,
      maxInteractionsPerRoute: sanitized.limits.maxInteractionsPerRoute ?? DEFAULT_RUNTIME_SCAN_LIMITS.maxInteractionsPerRoute,
      maxStatesPerRoute: sanitized.limits.maxStatesPerRoute ?? DEFAULT_RUNTIME_SCAN_LIMITS.maxStatesPerRoute,
      interactionDiscoveryTimeoutMs: sanitized.limits.interactionDiscoveryTimeoutMs ?? DEFAULT_RUNTIME_SCAN_LIMITS.interactionDiscoveryTimeoutMs,
    },
  };
};

const assertInside = (parent: string, candidate: string): string => {
  const root = path.resolve(parent);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_INVALID", "Runtime scan artifact path must stay inside runtime artifact root");
  }
  return resolved;
};

const assertSafeScanId = (scanId: string): void => {
  if (
    scanId.includes("\0") ||
    scanId.includes("/") ||
    scanId.includes("\\") ||
    scanId.includes("..") ||
    path.isAbsolute(scanId) ||
    /^[a-zA-Z]:/.test(scanId) ||
    !/^[a-zA-Z0-9._-]+$/.test(scanId)
  ) {
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_INVALID", "Runtime scan artifact scanId must be path-safe");
  }
};

const parseRuntimeScanResult = (raw: string, label: string): RuntimeScanResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_MALFORMED", `Runtime scan ${label} artifact is malformed JSON`);
  }
  try {
    return validateRuntimeScanResult(migrateLegacyRuntimeScanArtifact(parsed));
  } catch (error) {
    throw new RuntimeScanArtifactError(
      "RUNTIME_SCAN_ARTIFACT_INVALID",
      error instanceof Error ? `Runtime scan ${label} artifact invalid: ${error.message}` : `Runtime scan ${label} artifact invalid`,
    );
  }
};

const validateArtifactForRepository = (value: unknown, label: string): RuntimeScanResult => {
  try {
    return validateRuntimeScanResult(value);
  } catch (error) {
    throw new RuntimeScanArtifactError(
      "RUNTIME_SCAN_ARTIFACT_INVALID",
      error instanceof Error ? `Runtime scan ${label} artifact invalid: ${error.message}` : `Runtime scan ${label} artifact invalid`,
    );
  }
};

const atomicWriteJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  await fs.writeFile(tempPath, stableJson(value), "utf-8");
  await fs.rename(tempPath, filePath);
};

const withResultPath = (artifact: RuntimeScanResult, resultPath: string): RuntimeScanResult => ({
  ...artifact,
  artifacts: { ...artifact.artifacts, resultPath },
});

const metadataFor = (artifact: RuntimeScanResult): RuntimeScanArtifactMetaFile => ({
  schemaVersion: artifact.schemaVersion,
  artifactVersion: 1,
  scanId: artifact.scanId,
  savedAt: new Date().toISOString(),
  generatedAt: artifact.generatedAt,
  targetCount: artifact.targets.length,
  viewportCount: artifact.routes.reduce((sum, route) => sum + route.viewportResults.length, 0),
  screenshotCount: artifact.routes.reduce((sum, route) => sum + route.viewportResults.filter((viewport) => viewport.screenshotPath).length, 0),
  issueCount: artifact.routes.reduce((sum, route) => sum + route.viewportResults.reduce((inner, viewport) => inner + viewport.layoutIssues.length, 0), 0),
  errorCount: artifact.errors.length,
});

export const getRuntimeArtifactPaths = (input: { projectRoot: string; scanId: string }) => {
  assertSafeScanId(input.scanId);
  const projectRoot = path.resolve(input.projectRoot);
  const paths = resolveRuntimeArtifactRepositoryPaths({ projectRoot, scanId: input.scanId });
  const runtimeRoot = assertInside(projectRoot, paths.rootDir);
  for (const candidate of Object.values(paths)) assertInside(runtimeRoot, candidate);
  return paths;
};

export const runtimeScanArtifactPaths = getRuntimeArtifactPaths;

export const saveRuntimeScanSnapshot = async (result: RuntimeScanResult) => {
  const artifact = validateArtifactForRepository(result, "snapshot");
  const paths = getRuntimeArtifactPaths({ projectRoot: artifact.projectRoot, scanId: artifact.scanId });
  const snapshot = withResultPath(artifact, paths.snapshotPath);
  validateArtifactForRepository(snapshot, "snapshot");
  await atomicWriteJson(paths.snapshotPath, snapshot);
  parseRuntimeScanResult(await fs.readFile(paths.snapshotPath, "utf-8"), "snapshot");
  return { paths, snapshotPath: paths.snapshotPath };
};

export const saveLatestRuntimeScan = async (
  result: RuntimeScanResult,
  options: SaveRuntimeScanOptions = {},
) => {
  const artifact = validateArtifactForRepository(result, "latest");
  const paths = getRuntimeArtifactPaths({ projectRoot: artifact.projectRoot, scanId: artifact.scanId });
  const latest = withResultPath(artifact, paths.latestResultPath);
  const meta = metadataFor(latest);
  validateArtifactForRepository(latest, "latest");

  await atomicWriteJson(paths.latestResultPath, latest);
  await atomicWriteJson(paths.metaPath, meta);
  if (options.writeSnapshot !== false) await saveRuntimeScanSnapshot(artifact);
  parseRuntimeScanResult(await fs.readFile(paths.latestResultPath, "utf-8"), "latest");
  return { paths, meta };
};

export const readLatestRuntimeScan = async (projectRoot: string): Promise<RuntimeScanResult | null> => {
  const paths = getRuntimeArtifactPaths({ projectRoot, scanId: "latest" });
  try {
    return parseRuntimeScanResult(await fs.readFile(paths.latestResultPath, "utf-8"), "latest");
  } catch (error) {
    if (isNotFound(error)) return null;
    if (error instanceof RuntimeScanArtifactError) throw error;
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_IO", "Runtime scan latest artifact could not be read");
  }
};

export const readRuntimeScanSnapshot = async (projectRoot: string, scanId: string): Promise<RuntimeScanResult | null> => {
  const paths = getRuntimeArtifactPaths({ projectRoot, scanId });
  try {
    return parseRuntimeScanResult(await fs.readFile(paths.snapshotPath, "utf-8"), "snapshot");
  } catch (error) {
    if (isNotFound(error)) return null;
    if (error instanceof RuntimeScanArtifactError) throw error;
    throw new RuntimeScanArtifactError("RUNTIME_SCAN_ARTIFACT_IO", "Runtime scan snapshot artifact could not be read");
  }
};
