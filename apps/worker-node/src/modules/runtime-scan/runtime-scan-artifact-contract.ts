import path from "node:path";
import type { RuntimeScanResult } from "./runtime-scan.schema";

export type RuntimeArtifactRepositoryPaths = {
  rootDir: string;
  screenshotsDir: string;
  resultPath: string;
  latestResultPath: string;
  metaPath: string;
};

export type RuntimeArtifactRepositoryContract = {
  resolvePaths(input: { projectRoot: string; scanId: string }): RuntimeArtifactRepositoryPaths;
  saveLatest?(result: RuntimeScanResult): Promise<void>;
  readLatest?(projectRoot: string): Promise<RuntimeScanResult | null>;
};

export const resolveRuntimeArtifactRepositoryPaths = (input: {
  projectRoot: string;
  scanId: string;
}): RuntimeArtifactRepositoryPaths => {
  const rootDir = path.join(input.projectRoot, ".lutest", "runtime-scans", input.scanId);
  return {
    rootDir,
    screenshotsDir: path.join(rootDir, "screenshots"),
    resultPath: path.join(rootDir, "runtime-scan.json"),
    latestResultPath: path.join(input.projectRoot, ".lutest", "runtime-scans", "latest-runtime-scan.json"),
    metaPath: path.join(input.projectRoot, ".lutest", "runtime-scans", "latest-runtime-scan.meta.json"),
  };
};
