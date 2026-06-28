import path from "node:path";
import type { ScanResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { projectService } from "../project/project.service";
import { scanMapper } from "./scan.mapper";
import { scanRepository } from "./scan.repository";
import { graphService } from "../graph/graph.service";
import { ruleEngine } from "../rule/rule.engine";
export interface RunScanInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

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
