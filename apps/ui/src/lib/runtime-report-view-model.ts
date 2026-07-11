import type {
  ArtifactRef,
  LatestReportResponse,
  RuntimeArtifactDetailResponse,
  RuntimeArtifactDiagnosticKind,
  RuntimeLayoutIssue,
  RuntimeInteractionControlKind,
  RuntimeInteractionSkipReason,
  RuntimeScanError,
  RuntimeScanResult,
  RuntimeScanViewport,
  RuntimeScreenshotMissingReason,
} from "@lutest/contracts";

export type RuntimeReportFilters = {
  route: string;
  state: string;
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
  stateId: string;
  stateLabel: string;
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
  stateId: string;
  stateLabel: string;
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
  stateId: string;
  stateLabel: string;
  viewport: RuntimeScanViewport;
  screenshotAvailable: boolean;
  screenshotRef?: string;
  screenshotMissingReason?: RuntimeScreenshotMissingReason;
  issueCount: number;
};

export type RuntimeStateView = {
  id: string;
  label: string;
  targetId: string;
  route: string;
  viewportKey: string;
  interactionLabel?: string;
  skippedCount: number;
};

export type RuntimeSkippedInteractionView = {
  candidateId: string;
  label?: string;
  kind?: RuntimeInteractionControlKind;
  reason: RuntimeInteractionSkipReason;
  targetId: string;
  route: string;
  viewportKey: string;
};

export type RuntimeSkippedInteractionGroupView = RuntimeSkippedInteractionView & {
  observationCount: number;
  viewportCount: number;
};

export type RuntimeDiagnosticView = {
  kind: RuntimeArtifactDiagnosticKind;
  message: string;
  targetId: string;
  route: string;
  stateLabel: string;
  viewportKey: string;
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
  diagnosticCount: number;
  issueCountsBySeverity: Record<string, number>;
  targets: RuntimeTargetView[];
  viewports: RuntimeViewportView[];
  states: RuntimeStateView[];
  skippedInteractions: RuntimeSkippedInteractionView[];
  diagnostics: RuntimeDiagnosticView[];
  screenshotArtifacts: RuntimeScreenshotArtifactView[];
  issues: RuntimeIssueView[];
  errors: RuntimeScanError[];
  hasFullIssueData: boolean;
};

export const defaultRuntimeFilters: RuntimeReportFilters = {
  route: "all",
  state: "all",
  viewport: "all",
  severity: "all",
};

export const viewportKey = (viewport: RuntimeScanViewport): string =>
  `${viewport.width}x${viewport.height}`;

const emptyCounts: Record<string, number> = {};
const WCAG_AA_MIN_CLICK_TARGET_SIZE = 24;
const WCAG_AA_CLICK_TARGET_REASON = "WCAG 2.2 AA: at least 24×24 CSS px, or sufficient spacing from nearby targets.";

const isSafeRef = (value: string): boolean => /^shot_[a-f0-9]{32}$/.test(value);
const isLegacySmallClickTargetFalsePositive = (
  type: RuntimeLayoutIssue["type"],
  boundingBox: RuntimeLayoutIssue["evidence"]["boundingBox"],
): boolean =>
  type === "small-click-target" &&
  boundingBox.width >= WCAG_AA_MIN_CLICK_TARGET_SIZE &&
  boundingBox.height >= WCAG_AA_MIN_CLICK_TARGET_SIZE;
const visibleRuntimeIssues = (issues: RuntimeLayoutIssue[]): RuntimeLayoutIssue[] =>
  issues.filter((issue) => !isLegacySmallClickTargetFalsePositive(issue.type, issue.evidence.boundingBox));

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
  state: { id: string; label: string },
): RuntimeIssueView => {
  const screenshotRef = safeArtifactRef(issue.evidence.screenshotPath) ?? safeArtifactRef(fallbackScreenshotPath);
  return {
    id: issue.id,
    type: issue.type,
    severity: issue.severity,
    message: issue.message,
    scanTargetId: issue.scanTargetId,
    route: issue.route,
    stateId: state.id,
    stateLabel: state.label,
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
    viewportCount: new Set(target.viewportResults.map((viewport) => viewportKey(viewport.viewport))).size,
    issueCount: target.viewportResults.reduce(
      (total, viewport) => total + visibleRuntimeIssues(viewport.layoutIssues).length,
      0,
    ),
  }));
  const states: RuntimeStateView[] = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.map((viewportResult) => ({
      id: viewportResult.stateId ?? "state_baseline",
      label: viewportResult.stateLabel ?? "baseline",
      targetId: target.scanTargetId,
      route: target.route,
      viewportKey: viewportKey(viewportResult.viewport),
      interactionLabel: viewportResult.interactionSource?.label,
      skippedCount: viewportResult.skippedInteractions?.length ?? 0,
    })),
  );
  const viewports = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.map((viewportResult) => {
      const stateId = viewportResult.stateId ?? "state_baseline";
      const stateLabel = viewportResult.stateLabel ?? "baseline";
      return {
        key: `${target.scanTargetId}:${stateId}:${viewportKey(viewportResult.viewport)}`,
        targetId: target.scanTargetId,
        route: target.route,
        stateId,
        stateLabel,
        viewport: viewportResult.viewport,
        screenshotAvailable: Boolean(viewportResult.screenshotPath),
        screenshotRef: safeArtifactRef(viewportResult.screenshotPath),
        issueCount: visibleRuntimeIssues(viewportResult.layoutIssues).length,
      };
    }),
  );
  const issues = runtimeScan.targetResults.flatMap((target) =>
    target.viewportResults.flatMap((viewportResult) =>
      visibleRuntimeIssues(viewportResult.layoutIssues).map((issue) =>
        issueFromRuntime(issue, viewportResult.screenshotPath, {
          id: viewportResult.stateId ?? "state_baseline",
          label: viewportResult.stateLabel ?? "baseline",
        }),
      ),
    ),
  );
  const skippedInteractions = runtimeScan.targetResults.flatMap((target) => target.viewportResults.flatMap((viewportResult) =>
    (viewportResult.skippedInteractions ?? []).map((skipped): RuntimeSkippedInteractionView => ({
      candidateId: skipped.candidateId,
      label: skipped.label,
      kind: skipped.kind,
      reason: skipped.reason,
      targetId: target.scanTargetId,
      route: target.route,
      viewportKey: viewportKey(viewportResult.viewport),
    })),
  )).filter((item, index, items) => items.findIndex((candidate) => `${candidate.targetId}:${candidate.candidateId}:${candidate.reason}` === `${item.targetId}:${item.candidateId}:${item.reason}`) === index);
  const diagnostics = runtimeScan.targetResults.flatMap((target) => target.viewportResults.flatMap((viewportResult) => {
    const base = {
      targetId: target.scanTargetId,
      route: target.route,
      stateLabel: viewportResult.stateLabel ?? "baseline",
      viewportKey: viewportKey(viewportResult.viewport),
    };
    return [
      ...viewportResult.consoleErrors.filter((message) => !/^Failed to load resource:/i.test(message)).map((message): RuntimeDiagnosticView => ({ ...base, kind: "console-error", message })),
      ...viewportResult.pageErrors.map((message): RuntimeDiagnosticView => ({ ...base, kind: "page-error", message })),
      ...viewportResult.networkErrors.map((message): RuntimeDiagnosticView => ({ ...base, kind: "network-error", message })),
      ...viewportResult.failedResponses.map((message): RuntimeDiagnosticView => ({ ...base, kind: "failed-response", message })),
    ];
  }));
  const screenshotArtifacts = viewports.reduce<RuntimeScreenshotArtifactView[]>(
    (artifacts, viewport) => {
      if (artifacts.some((artifact) => artifact.id === viewport.key)) return artifacts;
      artifacts.push({
        id: viewport.key,
        scanTargetId: viewport.targetId,
        route: viewport.route,
        stateId: viewport.stateId,
        stateLabel: viewport.stateLabel,
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
    diagnosticCount: diagnostics.length,
    issueCountsBySeverity,
    targets,
    viewports,
    states,
    skippedInteractions,
    diagnostics,
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
    issues.filter((issue) => !isLegacySmallClickTargetFalsePositive(issue.type, issue.evidence.boundingBox));
  const targets = detail.targetResults.map((target) => ({
    id: target.scanTargetId,
    name: target.stateLabel,
    kind: target.kind,
    route: target.route,
    status: target.status,
    viewportCount: new Set(target.viewportResults.map((viewport) => viewportKey(viewport.viewport))).size,
    issueCount: target.viewportResults.reduce((sum, viewport) => sum + visibleDetailIssues(viewport.issues).length, 0),
  }));
  const viewports = detail.targetResults.flatMap((target) => target.viewportResults.map((viewportResult) => ({
    key: `${target.scanTargetId}:${viewportResult.stateId ?? "state_baseline"}:${viewportKey(viewportResult.viewport)}`,
    targetId: target.scanTargetId,
    route: target.route,
    stateId: viewportResult.stateId ?? "state_baseline",
    stateLabel: viewportResult.stateLabel ?? "baseline",
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
    stateId: issue.evidence.stateId ?? viewportResult.stateId ?? "state_baseline",
    stateLabel: issue.evidence.stateLabel ?? viewportResult.stateLabel ?? "baseline",
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
  const states: RuntimeStateView[] = detail.targetResults.flatMap((target) => target.viewportResults.map((viewportResult) => ({
    id: viewportResult.stateId ?? "state_baseline",
    label: viewportResult.stateLabel ?? "baseline",
    targetId: target.scanTargetId,
    route: target.route,
    viewportKey: viewportKey(viewportResult.viewport),
    interactionLabel: viewportResult.interactionSource?.label,
    skippedCount: viewportResult.skippedInteractions?.length ?? 0,
  })));
  const skippedInteractions = detail.targetResults.flatMap((target) => target.viewportResults.flatMap((viewportResult) =>
    (viewportResult.skippedInteractions ?? []).map((skipped): RuntimeSkippedInteractionView => ({
      candidateId: skipped.candidateId,
      label: skipped.label,
      kind: skipped.kind,
      reason: skipped.reason,
      targetId: target.scanTargetId,
      route: target.route,
      viewportKey: viewportKey(viewportResult.viewport),
    })),
  )).filter((item, index, items) => items.findIndex((candidate) => `${candidate.targetId}:${candidate.candidateId}:${candidate.reason}` === `${item.targetId}:${item.candidateId}:${item.reason}`) === index);
  const diagnostics = detail.targetResults.flatMap((target) => target.viewportResults.flatMap((viewportResult) => viewportResult.diagnostics.map((diagnostic): RuntimeDiagnosticView => ({
    kind: diagnostic.kind,
    message: diagnostic.message,
    targetId: target.scanTargetId,
    route: target.route,
    stateLabel: viewportResult.stateLabel ?? "baseline",
    viewportKey: viewportKey(viewportResult.viewport),
  }))));
  const screenshotArtifacts = viewports.map((viewport): RuntimeScreenshotArtifactView => ({
    id: viewport.key,
    scanTargetId: viewport.targetId,
    route: viewport.route,
    stateId: viewport.stateId,
    stateLabel: viewport.stateLabel,
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
    diagnosticCount: diagnostics.length,
    issueCountsBySeverity,
    targets,
    viewports,
    states,
    skippedInteractions,
    diagnostics,
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
      diagnosticCount: 0,
      issueCountsBySeverity: emptyCounts,
      targets: [],
      viewports: [],
      states: [],
      skippedInteractions: [],
      diagnostics: [],
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
    diagnosticCount: 0,
    issueCountsBySeverity: summary.issueSummary.bySeverity,
    targets: [],
    viewports: [],
    states: [],
    skippedInteractions: [],
    diagnostics: [],
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
    (filters.route === "all" || issue.route === filters.route) &&
    (filters.state === "all" || issue.stateLabel === filters.state) &&
    (filters.viewport === "all" || issue.viewportKey === filters.viewport) &&
    (filters.severity === "all" || issue.severity === filters.severity),
  );

export function groupRuntimeSkippedInteractions(
  skippedInteractions: RuntimeSkippedInteractionView[],
): RuntimeSkippedInteractionGroupView[] {
  const groups = new Map<string, RuntimeSkippedInteractionGroupView & { viewportKeys: Set<string> }>();
  for (const skipped of skippedInteractions) {
    const key = `${skipped.route}\u0000${skipped.candidateId}\u0000${skipped.reason}`;
    const current = groups.get(key);
    if (current) {
      current.observationCount += 1;
      current.viewportKeys.add(skipped.viewportKey);
      current.viewportCount = current.viewportKeys.size;
      continue;
    }
    groups.set(key, {
      ...skipped,
      observationCount: 1,
      viewportCount: 1,
      viewportKeys: new Set([skipped.viewportKey]),
    });
  }
  return Array.from(groups.values())
    .map(({ candidateId, label, kind, reason, targetId, route, viewportKey, observationCount, viewportCount }) => ({
      candidateId,
      label,
      kind,
      reason,
      targetId,
      route,
      viewportKey,
      observationCount,
      viewportCount,
    }))
    .sort((left, right) => right.observationCount - left.observationCount || left.route.localeCompare(right.route) || (left.label ?? left.candidateId).localeCompare(right.label ?? right.candidateId));
}
