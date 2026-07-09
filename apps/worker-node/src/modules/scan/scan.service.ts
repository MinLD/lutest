import path from "node:path";
import type { RuntimeScanRequest as PublicRuntimeScanRequest, RuntimeScanResult as PublicRuntimeScanResult, ScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { HttpError } from "../../shared/errors/http-error";
import { projectService } from "../project/project.service";
import { scanMapper } from "./scan.mapper";
import { scanRepository } from "./scan.repository";
import { graphService } from "../graph/graph.service";
import { ruleEngine } from "../rule/rule.engine";
import { PlaywrightBrowserPreflightError } from "../runtime-scan/playwright-browser-preflight";
import { runPlaywrightRuntimeScan } from "../runtime-scan/playwright-scan.service";
import { RuntimeScanArtifactError } from "../runtime-scan/runtime-scan-artifacts";
import { RuntimePublicContractAdapterError, mapInternalRuntimeScanResult, mapPublicRuntimeScanRequest } from "../runtime-scan/runtime-public-contract-adapter";
import type { RuntimeScanRequest as InternalRuntimeScanRequest, RuntimeScanResult as InternalRuntimeScanResult } from "../runtime-scan/playwright-scan.types";
import { AuthStateError, authStatePaths, readAuthStorageState } from "../auth/auth-state.repository";
export interface RunScanInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  runtimeScan?: PublicRuntimeScanRequest;
}

export type RuntimeScanRunner = (request: InternalRuntimeScanRequest) => Promise<InternalRuntimeScanResult>;

let runtimeScanRunner: RuntimeScanRunner = runPlaywrightRuntimeScan;

export const setRuntimeScanRunnerForTest = (runner: RuntimeScanRunner): (() => void) => {
  const previous = runtimeScanRunner;
  runtimeScanRunner = runner;
  return () => { runtimeScanRunner = previous; };
};

const createScanId = (): string => {
  return `scan_${Date.now()}`;
};

const runScan = async (input: RunScanInput): Promise<ScanResponse> => {
  const startedAt = new Date().toISOString();
  const scanId = createScanId();

  const paths = await pathService.resolveProjectPaths(input);

  const discovery = await projectService.discoverProject(input);

  await graphService.buildAndSaveGraph({
    cwd: input.cwd,
    rootDir: discovery.summary.rootDir,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  const ruleIssues = await ruleEngine.runRules({
    projectRoot: discovery.summary.rootDir,
    sourceFiles: discovery.sourceFiles,
  });

  let runtimeScan: PublicRuntimeScanResult | undefined;
  if (input.runtimeScan?.enabled) {
    try {
      const runtimeRequest = mapPublicRuntimeScanRequest({
        projectRoot: discovery.summary.rootDir,
        request: input.runtimeScan,
      });
      if (input.runtimeScan.auth?.useSavedState) {
        try { await readAuthStorageState(discovery.summary.rootDir); runtimeRequest.storageStatePath = authStatePaths(discovery.summary.rootDir).statePath; }
        catch (error) { if (error instanceof AuthStateError) throw new HttpError(error.code === "AUTH_STATE_MISSING" ? 400 : 400, error.code, error.message); throw error; }
      }
      runtimeScan = mapInternalRuntimeScanResult(await runtimeScanRunner(runtimeRequest));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof PlaywrightBrowserPreflightError) {
        throw new HttpError(400, error.code, error.message, error.remediation ? { remediation: error.remediation } : undefined);
      }
      if (error instanceof RuntimeScanArtifactError) {
        throw new HttpError(500, "ARTIFACT_WRITE_ERROR", "Runtime scan artifact could not be saved.");
      }
      if (error instanceof RuntimePublicContractAdapterError) {
        throw new HttpError(error.code === "CONFIG_ERROR" ? 400 : 500, error.code, error.message);
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("local HTTP(S) URL")) throw new HttpError(400, "BASE_URL_NOT_LOCAL", "Runtime scan baseUrl must be a local HTTP(S) URL.");
      if (message.includes("route discovery")) throw new HttpError(500, "ROUTE_DISCOVERY_ERROR", "Runtime route discovery failed.");
      throw new HttpError(500, "RUNTIME_SCAN_FAILED", "Runtime scan failed.");
    }
  }

  const baseIssues = discovery.summary.packageJsonExists
    ? []
    : [
        {
          id: "missing-package-json",
          type: "unknown" as const,
          severity: "warning" as const,
          message: "package.json not found in target project",
        },
      ];
  const issues = [...baseIssues, ...ruleIssues];
  const finishedAt = new Date().toISOString();
  const reportPath = path.join(paths.reportDir, `${scanId}.json`);

  const response = scanMapper.toScanResponse({
    scanId,
    startedAt,
    finishedAt,
    project: discovery.summary,
    sourceFileCount: discovery.sourceFiles.length,
    issues,
    reportPath,
    ...(runtimeScan ? { runtimeScan } : {}),
  });

  await scanRepository.saveReport({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
    report: response,
  });
  return response;
};

export const scanService = {
  runScan,
};
