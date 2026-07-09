import type {
  ArtifactRef,
  LatestReportResponse,
  RuntimeLayoutIssue,
  RuntimeScanError,
  RuntimeScanResult,
  RuntimeScanViewport,
} from "@lutest/contracts";

export type RuntimeReportFilters = {
  targetId: string;
  route: string;
  viewport: string;
  severity: string;
};

export type RuntimeIssueView = {
  id: string;
  type: RuntimeLayoutIssue["type"];
  severity: RuntimeLayoutIssue["severity"];
  message: string;
  scanTargetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  viewportKey: string;
  elementRef: string;
  selectorHint?: string;
  boundingBox: RuntimeLayoutIssue["evidence"]["boundingBox"];
  relatedElementRef?: string;
  relatedSelectorHint?: string;
  relatedBoundingBox?: RuntimeLayoutIssue["evidence"]["relatedBoundingBox"];
  overlapArea?: number;
  overlapRatio?: number;
  threshold: string;
  screenshotRef?: string;
};

export type RuntimeTargetView = {
  id: string;
  name?: string;
  kind: string;
  route: string;
  status: string;
  viewportCount: number;
  issueCount: number;
};

export type RuntimeViewportView = {
  key: string;
  targetId: string;
  route: string;
  viewport: RuntimeScanViewport;
  screenshotAvailable: boolean;
  screenshotRef?: string;
  issueCount: number;
};

export type RuntimeReportViewModel = {
  runtimeEnabled: boolean;
  status?: string;
  scanId?: string;
  baseUrl?: string;
  artifactRef?: ArtifactRef;
  metaLabel?: string;
  targetCount: number;
  viewportCount: number;
  screenshotCount: number;
  issueCount: number;
  errorCount: number;
  issueCountsBySeverity: Record<string, number>;
  targets: RuntimeTargetView[];
  viewports: RuntimeViewportView[];
  issues: RuntimeIssueView[];
  errors: RuntimeScanError[];
  hasFullIssueData: boolean;
};

export const defaultRuntimeFilters: RuntimeReportFilters = {
  targetId: "all",
  route: "all",
  viewport: "all",
  severity: "all",
};

export const viewportKey = (viewport: RuntimeScanViewport): string =>
  `${viewport.width}x${viewport.height}`;

const emptyCounts: Record<string, number> = {};

const isSafeRef = (value: string): boolean =>
  value.length > 0 &&
  !value.startsWith("/") &&
  !/^[a-zA-Z]:[\\/]/.test(value) &&
  !value.includes("..") &&
  !/(cookie|token|password|storageState|localStorage|sessionStorage)/i.test(value);

export const safeArtifactRef = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (isSafeRef(value)) return value;
  return undefined;
};

const issueFromRuntime = (
  issue: RuntimeLayoutIssue,
  fallbackScreenshotPath: string | undefined,
): RuntimeIssueView => ({
  id: issue.id,
  type: issue.type,
  severity: issue.severity,
  message: issue.message,
  scanTargetId: issue.scanTargetId,
  route: issue.route,
  viewport: issue.viewport,
  viewportKey: viewportKey(issue.viewport),
  elementRef: issue.elementRef,
  selectorHint: issue.evidence.selectorHint,
  boundingBox: issue.evidence.boundingBox,
  relatedElementRef: issue.evidence.relatedElementRef,
  relatedSelectorHint: issue.evidence.relatedSelectorHint,
  relatedBoundingBox: issue.evidence.relatedBoundingBox,
  overlapArea: issue.evidence.overlapArea,
  overlapRatio: issue.evidence.overlapRatio,
  threshold: issue.evidence.threshold,
  screenshotRef: safeArtifactRef(issue.evidence.screenshotPath ?? fallbackScreenshotPath),
});

const fromRuntimeScan = (runtimeScan: RuntimeScanResult): RuntimeReportViewModel => {
  const targets = runtimeScan.targetResults.map((target) => ({
    id: target.scanTargetId,
    name: target.name,
    kind: target.kind,
    route: target.route,
    status: target.status,
    viewportCount: target.viewportResults.length,
    issueCount: target.viewportResults.reduce(
      (total, viewport) => total + viewport.layoutIssues.length,
      0,
    ),
  }));
  const viewports = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.map((viewportResult) => ({
      key: `${target.scanTargetId}:${viewportKey(viewportResult.viewport)}`,
      targetId: target.scanTargetId,
      route: target.route,
      viewport: viewportResult.viewport,
      screenshotAvailable: Boolean(viewportResult.screenshotPath),
      screenshotRef: safeArtifactRef(viewportResult.screenshotPath),
      issueCount: viewportResult.layoutIssues.length,
    })),
  );
  const issues = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.flatMap((viewportResult) =>
      viewportResult.layoutIssues.map((issue) =>
        issueFromRuntime(issue, viewportResult.screenshotPath),
      ),
    ),
  );
  const issueCountsBySeverity = issues.reduce<Record<string, number>>(
    (counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
      return counts;
    },
    {},
  );
  return {
    runtimeEnabled: true,
    status: runtimeScan.status,
    scanId: runtimeScan.scanId,
    baseUrl: runtimeScan.baseUrl,
    targetCount: runtimeScan.summary.targetCount,
    viewportCount: runtimeScan.summary.viewportCount,
    screenshotCount: runtimeScan.summary.screenshotCount,
    issueCount: runtimeScan.summary.issueCount,
    errorCount: runtimeScan.summary.errorCount,
    issueCountsBySeverity,
    targets,
    viewports,
    issues,
    errors: [
      ...runtimeScan.errors,
      ...runtimeScan.targetResults.flatMap((target) => target.errors),
      ...runtimeScan.targetResults.flatMap((target) =>
        target.viewportResults.flatMap((viewport) => viewport.errors),
      ),
    ].slice(0, 5),
    hasFullIssueData: true,
  };
};

export const runtimeReportViewModel = (
  latestReport: LatestReportResponse | null,
): RuntimeReportViewModel => {
  if (latestReport?.state !== "valid") {
    return {
      runtimeEnabled: false,
      targetCount: 0,
      viewportCount: 0,
      screenshotCount: 0,
      issueCount: 0,
      errorCount: 0,
      issueCountsBySeverity: emptyCounts,
      targets: [],
      viewports: [],
      issues: [],
      errors: [],
      hasFullIssueData: false,
    };
  }
  const fullRuntimeScan = latestReport.runtimeScan ?? latestReport.report.runtimeScan;
  if (fullRuntimeScan) return fromRuntimeScan(fullRuntimeScan);
  const summary = latestReport.runtimeScanSummary;
  if (!summary) return runtimeReportViewModel(null);
  return {
    runtimeEnabled: true,
    status: summary.status,
    scanId: summary.meta?.scanId,
    artifactRef: summary.artifactRef,
    metaLabel: summary.meta
      ? `${summary.meta.schemaVersion} · ${summary.meta.scanId}`
      : undefined,
    targetCount: summary.targetCount,
    viewportCount: summary.viewportCount,
    screenshotCount: summary.screenshotCount,
    issueCount: summary.issueCount,
    errorCount: summary.errorCount,
    issueCountsBySeverity: summary.issueSummary.bySeverity,
    targets: [],
    viewports: [],
    issues: [],
    errors: [],
    hasFullIssueData: false,
  };
};

export const filterRuntimeIssues = (
  issues: RuntimeIssueView[],
  filters: RuntimeReportFilters,
): RuntimeIssueView[] =>
  issues.filter((issue) =>
    (filters.targetId === "all" || issue.scanTargetId === filters.targetId) &&
    (filters.route === "all" || issue.route === filters.route) &&
    (filters.viewport === "all" || issue.viewportKey === filters.viewport) &&
    (filters.severity === "all" || issue.severity === filters.severity),
  );
