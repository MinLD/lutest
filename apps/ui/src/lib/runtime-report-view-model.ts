import type {
  ArtifactRef,
  LatestReportResponse,
  RuntimeArtifactDetailResponse,
  RuntimeLayoutIssue,
  RuntimeScanError,
  RuntimeScanResult,
  RuntimeScanViewport,
  RuntimeScreenshotMissingReason,
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
  screenshotAvailable: boolean;
  screenshotRef?: string;
  screenshotMissingReason?: RuntimeScreenshotMissingReason;
};

export type RuntimeScreenshotArtifactView = {
  id: string;
  scanTargetId: string;
  route: string;
  viewportLabel: string;
  viewportWidth: number;
  viewportHeight: number;
  safeRef?: string;
  missingReason?: RuntimeScreenshotMissingReason;
  available: boolean;
  issueCount: number;
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
  screenshotMissingReason?: RuntimeScreenshotMissingReason;
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
  screenshotArtifacts: RuntimeScreenshotArtifactView[];
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
const WCAG_AA_MIN_CLICK_TARGET_SIZE = 24;
const WCAG_AA_CLICK_TARGET_REASON = "WCAG 2.2 AA: at least 24×24 CSS px, or sufficient spacing from nearby targets.";

const isSafeRef = (value: string): boolean => /^shot_[a-f0-9]{32}$/.test(value);
const isIgnoredInfrastructureSelector = (selector: string | undefined): boolean =>
  Boolean(selector?.includes("react-flow__viewport") || selector?.includes("xyflow__viewport"));
const isLegacySmallClickTargetFalsePositive = (
  type: RuntimeLayoutIssue["type"],
  boundingBox: RuntimeLayoutIssue["evidence"]["boundingBox"],
): boolean =>
  type === "small-click-target" &&
  boundingBox.width >= WCAG_AA_MIN_CLICK_TARGET_SIZE &&
  boundingBox.height >= WCAG_AA_MIN_CLICK_TARGET_SIZE;
const visibleRuntimeIssues = (issues: RuntimeLayoutIssue[]): RuntimeLayoutIssue[] =>
  issues.filter((issue) =>
    !isIgnoredInfrastructureSelector(issue.evidence.selectorHint) &&
    !isLegacySmallClickTargetFalsePositive(issue.type, issue.evidence.boundingBox),
  );

const visibleIssueReason = (
  type: RuntimeLayoutIssue["type"],
  reason: string,
): string => type === "small-click-target" ? WCAG_AA_CLICK_TARGET_REASON : reason;

export const safeArtifactRef = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (isSafeRef(value)) return value;
  return undefined;
};

const issueFromRuntime = (
  issue: RuntimeLayoutIssue,
  fallbackScreenshotPath: string | undefined,
): RuntimeIssueView => {
  const screenshotRef = safeArtifactRef(issue.evidence.screenshotPath) ?? safeArtifactRef(fallbackScreenshotPath);
  return {
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
    threshold: visibleIssueReason(issue.type, issue.evidence.threshold),
    screenshotAvailable: Boolean(issue.evidence.screenshotPath ?? fallbackScreenshotPath),
    screenshotRef,
  };
};

const fromRuntimeScan = (runtimeScan: RuntimeScanResult): RuntimeReportViewModel => {
  const targets = runtimeScan.targetResults.map((target) => ({
    id: target.scanTargetId,
    name: target.name,
    kind: target.kind,
    route: target.route,
    status: target.status,
    viewportCount: target.viewportResults.length,
    issueCount: target.viewportResults.reduce(
      (total, viewport) => total + visibleRuntimeIssues(viewport.layoutIssues).length,
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
      issueCount: visibleRuntimeIssues(viewportResult.layoutIssues).length,
    })),
  );
  const issues = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.flatMap((viewportResult) =>
      visibleRuntimeIssues(viewportResult.layoutIssues).map((issue) =>
        issueFromRuntime(issue, viewportResult.screenshotPath),
      ),
    ),
  );
  const screenshotArtifacts = viewports.reduce<RuntimeScreenshotArtifactView[]>(
    (artifacts, viewport) => {
      if (artifacts.some((artifact) => artifact.id === viewport.key)) return artifacts;
      artifacts.push({
        id: viewport.key,
        scanTargetId: viewport.targetId,
        route: viewport.route,
        viewportLabel: viewportKey(viewport.viewport),
        viewportWidth: viewport.viewport.width,
        viewportHeight: viewport.viewport.height,
        safeRef: viewport.screenshotRef,
        available: viewport.screenshotAvailable,
        issueCount: viewport.issueCount,
      });
      return artifacts;
    },
    [],
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
    issueCount: issues.length,
    errorCount: runtimeScan.summary.errorCount,
    issueCountsBySeverity,
    targets,
    viewports,
    screenshotArtifacts,
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

const fromRuntimeArtifactDetail = (detail: RuntimeArtifactDetailResponse): RuntimeReportViewModel => {
  const visibleDetailIssues = (issues: RuntimeArtifactDetailResponse["targetResults"][number]["viewportResults"][number]["issues"]) =>
    issues.filter((issue) =>
      !isIgnoredInfrastructureSelector(issue.evidence.selector) &&
      !isLegacySmallClickTargetFalsePositive(issue.type, issue.evidence.boundingBox),
    );
  const targets = detail.targetResults.map((target) => ({
    id: target.scanTargetId,
    name: target.stateLabel,
    kind: target.kind,
    route: target.route,
    status: target.status,
    viewportCount: target.viewportResults.length,
    issueCount: target.viewportResults.reduce((sum, viewport) => sum + visibleDetailIssues(viewport.issues).length, 0),
  }));
  const viewports = detail.targetResults.flatMap((target) => target.viewportResults.map((viewportResult) => ({
    key: `${target.scanTargetId}:${viewportKey(viewportResult.viewport)}`,
    targetId: target.scanTargetId,
    route: target.route,
    viewport: viewportResult.viewport,
    screenshotAvailable: viewportResult.screenshot.available,
    screenshotRef: viewportResult.screenshot.ref,
    screenshotMissingReason: viewportResult.screenshot.missingReason,
    issueCount: visibleDetailIssues(viewportResult.issues).length,
  })));
  const issues = detail.targetResults.flatMap((target) => target.viewportResults.flatMap((viewportResult) => visibleDetailIssues(viewportResult.issues).map((issue): RuntimeIssueView => ({
    id: issue.id,
    type: issue.type,
    severity: issue.severity,
    message: issue.message,
    scanTargetId: issue.evidence.scanTargetId,
    route: issue.evidence.route,
    viewport: issue.evidence.viewport,
    viewportKey: viewportKey(issue.evidence.viewport),
    elementRef: issue.evidence.elementRef,
    selectorHint: issue.evidence.selector,
    boundingBox: issue.evidence.boundingBox,
    relatedBoundingBox: issue.evidence.relatedBoundingBox,
    threshold: visibleIssueReason(issue.type, issue.evidence.reason),
    screenshotAvailable: issue.evidence.screenshot.available,
    screenshotRef: issue.evidence.screenshot.ref,
    screenshotMissingReason: issue.evidence.screenshot.missingReason,
  }))));
  const screenshotArtifacts = viewports.map((viewport): RuntimeScreenshotArtifactView => ({
    id: viewport.key,
    scanTargetId: viewport.targetId,
    route: viewport.route,
    viewportLabel: viewportKey(viewport.viewport),
    viewportWidth: viewport.viewport.width,
    viewportHeight: viewport.viewport.height,
    safeRef: viewport.screenshotRef,
    missingReason: viewport.screenshotMissingReason,
    available: viewport.screenshotAvailable,
    issueCount: viewport.issueCount,
  }));
  const issueCountsBySeverity = issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});
  return {
    runtimeEnabled: true,
    status: detail.status,
    scanId: detail.scanId,
    baseUrl: detail.baseUrl,
    targetCount: detail.summary.targetCount,
    viewportCount: detail.summary.viewportCount,
    screenshotCount: detail.summary.screenshotCount,
    issueCount: issues.length,
    errorCount: detail.summary.errorCount,
    issueCountsBySeverity,
    targets,
    viewports,
    screenshotArtifacts,
    issues,
    errors: [],
    hasFullIssueData: true,
  };
};

export const runtimeReportViewModel = (
  latestReport: LatestReportResponse | null,
  runtimeArtifactDetail?: RuntimeArtifactDetailResponse | null,
): RuntimeReportViewModel => {
  if (runtimeArtifactDetail) return fromRuntimeArtifactDetail(runtimeArtifactDetail);
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
      screenshotArtifacts: [],
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
    screenshotArtifacts: [],
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

export const runtimeIssueFilters = (issue: RuntimeIssueView): RuntimeReportFilters => ({
  targetId: issue.scanTargetId,
  route: issue.route,
  viewport: issue.viewportKey,
  severity: issue.severity,
});
