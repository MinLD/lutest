import fs from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactRef,
  LatestReportResponse,
  LatestRuntimeIssueSummary,
  RuntimeArtifactMeta,
  RuntimeLayoutIssue,
  RuntimeScanResult,
  ScanIssue,
  ScanResponse,
} from "@lutest/contracts";
import { validateLatestReportResponse } from "@lutest/contracts";
import { productionGraphArtifactPaths } from "../graph/production/production-graph-artifacts";
import { runtimeScanArtifactPaths } from "../runtime-scan/runtime-scan-artifacts";

const normalize = (value: string): string => value.replaceAll("\\", "/");

const safeRef = (projectRoot: string, filePath: string): string => {
  const relative = normalize(path.relative(projectRoot, filePath));
  if (!relative || relative.startsWith("../") || relative === ".." || path.isAbsolute(relative) || relative.includes("\0") || relative.includes("..")) {
    throw new Error("Artifact ref must stay under selected project root");
  }
  return relative;
};

const statSize = async (filePath: string): Promise<number | undefined> => {
  try {
    return (await fs.stat(filePath)).size;
  } catch {
    return undefined;
  }
};

const existingArtifactRef = async (input: {
  projectRoot: string;
  filePath: string;
  kind: ArtifactRef["kind"];
  label: string;
  generatedAt?: string;
}): Promise<ArtifactRef | null> => {
  const sizeBytes = await statSize(input.filePath);
  if (sizeBytes === undefined) return null;
  return { kind: input.kind, ref: safeRef(input.projectRoot, input.filePath), label: input.label, sizeBytes, generatedAt: input.generatedAt };
};

const countStatic = (issues: ScanIssue[], severity: ScanIssue["severity"]): number =>
  issues.filter((issue) => issue.severity === severity).length;

const runtimeIssues = (runtimeScan: RuntimeScanResult): RuntimeLayoutIssue[] =>
  runtimeScan.targetResults.flatMap((target) => target.viewportResults.flatMap((viewport) => viewport.layoutIssues));

const runtimeIssueSummary = (runtimeScan: RuntimeScanResult): LatestRuntimeIssueSummary => {
  const issues = runtimeIssues(runtimeScan);
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
    byType[issue.type] = (byType[issue.type] ?? 0) + 1;
  }
  return { total: issues.length, bySeverity, byType };
};

const runtimeMeta = (runtimeScan: RuntimeScanResult): RuntimeArtifactMeta => ({
  scanId: runtimeScan.scanId,
  savedAt: runtimeScan.finishedAt,
  schemaVersion: "runtime-scan.v1",
  artifactVersion: 1,
  targetCount: runtimeScan.summary.targetCount,
  viewportCount: runtimeScan.summary.viewportCount,
  screenshotCount: runtimeScan.summary.screenshotCount,
  issueCount: runtimeScan.summary.issueCount,
  errorCount: runtimeScan.summary.errorCount,
});

export const mapLatestReportResponse = async (input: {
  report: ScanResponse;
  projectRoot: string;
}): Promise<LatestReportResponse> => {
  const reportRef = await existingArtifactRef({
    projectRoot: input.projectRoot,
    filePath: input.report.reportPath,
    kind: "static-report",
    label: "Latest static report",
    generatedAt: input.report.finishedAt,
  });
  const graphPaths = productionGraphArtifactPaths(input.projectRoot);
  const graphRef = await existingArtifactRef({
    projectRoot: input.projectRoot,
    filePath: graphPaths.latestGraphPath,
    kind: "production-graph",
    label: "Latest production graph",
    generatedAt: input.report.finishedAt,
  });
  const runtimeScan = input.report.runtimeScan ?? undefined;
  const runtimePaths = runtimeScan ? runtimeScanArtifactPaths({ projectRoot: input.projectRoot, scanId: runtimeScan.scanId }) : undefined;
  const runtimeRef = runtimePaths ? await existingArtifactRef({
    projectRoot: input.projectRoot,
    filePath: runtimePaths.latestResultPath,
    kind: "runtime-scan",
    label: "Latest runtime scan",
    generatedAt: runtimeScan?.finishedAt,
  }) : null;
  const runtimeMetaRef = runtimePaths ? await existingArtifactRef({
    projectRoot: input.projectRoot,
    filePath: runtimePaths.metaPath,
    kind: "runtime-scan-meta",
    label: "Latest runtime scan metadata",
    generatedAt: runtimeScan?.finishedAt,
  }) : null;
  const artifactRefs = [reportRef, graphRef, runtimeRef, runtimeMetaRef].filter((ref): ref is ArtifactRef => Boolean(ref));
  const response: LatestReportResponse = {
    state: "valid",
    generatedAt: input.report.finishedAt,
    project: {
      name: input.report.project.name,
      selectedRootRef: ".",
      selectedRootLabel: path.basename(input.projectRoot),
    },
    report: {
      ...input.report,
      reportPath: safeRef(input.projectRoot, input.report.reportPath),
      project: { ...input.report.project, rootDir: ".", lutestDir: ".lutest" },
      runtimeScan: input.report.runtimeScan ? null : undefined,
    },
    staticScan: {
      status: input.report.status,
      issueCount: input.report.issues.length,
      errorCount: countStatic(input.report.issues, "error"),
      warningCount: countStatic(input.report.issues, "warning"),
      infoCount: countStatic(input.report.issues, "info"),
      sourceFileCount: input.report.sourceFileCount,
      reportRef: reportRef ?? undefined,
    },
    productionGraph: graphRef ? { artifactRef: graphRef } : null,
    runtimeScanSummary: runtimeScan ? {
      status: runtimeScan.status,
      targetCount: runtimeScan.summary.targetCount,
      viewportCount: runtimeScan.summary.viewportCount,
      screenshotCount: runtimeScan.summary.screenshotCount,
      issueCount: runtimeScan.summary.issueCount,
      errorCount: runtimeScan.summary.errorCount,
      issueSummary: runtimeIssueSummary(runtimeScan),
      artifactRef: runtimeRef ?? undefined,
      meta: runtimeMeta(runtimeScan),
    } : null,
    runtimeScan: null,
    runtimeArtifactMeta: runtimeScan ? runtimeMeta(runtimeScan) : null,
    artifactRefs,
  };
  const validation = validateLatestReportResponse(response);
  if (!validation.ok) throw new Error(`Latest report response invalid: ${validation.message}`);
  return validation.value;
};
