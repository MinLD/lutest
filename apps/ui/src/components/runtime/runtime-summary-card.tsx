import type {
  ArtifactRef,
  LatestReportResponse,
  LatestRuntimeScanSummary,
  RuntimeScanError,
  RuntimeScanResult,
} from "@lutest/contracts";

type RuntimeSummarySource = {
  scanId?: string;
  baseUrl?: string;
  status?: string;
  targetCount: number;
  viewportCount: number;
  screenshotCount: number;
  issueCount: number;
  errorCount: number;
  bySeverity: Record<string, number>;
  errors: RuntimeScanError[];
  artifactRef?: ArtifactRef;
  metaLabel?: string;
  authState: "not exposed" | "not reported";
};

const emptySeverity: Record<string, number> = {};

const fromSummary = (summary: LatestRuntimeScanSummary): RuntimeSummarySource => ({
  status: summary.status,
  targetCount: summary.targetCount,
  viewportCount: summary.viewportCount,
  screenshotCount: summary.screenshotCount,
  issueCount: summary.issueCount,
  errorCount: summary.errorCount,
  bySeverity: summary.issueSummary.bySeverity,
  errors: [],
  artifactRef: summary.artifactRef,
  metaLabel: summary.meta
    ? `${summary.meta.schemaVersion} · ${summary.meta.scanId}`
    : undefined,
  authState: "not exposed",
});

const fromRuntimeScan = (runtimeScan: RuntimeScanResult): RuntimeSummarySource => ({
  scanId: runtimeScan.scanId,
  baseUrl: runtimeScan.baseUrl,
  status: runtimeScan.status,
  targetCount: runtimeScan.summary.targetCount,
  viewportCount: runtimeScan.summary.viewportCount,
  screenshotCount: runtimeScan.summary.screenshotCount,
  issueCount: runtimeScan.summary.issueCount,
  errorCount: runtimeScan.summary.errorCount,
  bySeverity: runtimeScan.targetResults
    .flatMap((target) => target.viewportResults)
    .flatMap((viewport) => viewport.layoutIssues)
    .reduce<Record<string, number>>((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
      return counts;
    }, {}),
  errors: [
    ...runtimeScan.errors,
    ...runtimeScan.targetResults.flatMap((target) => target.errors),
    ...runtimeScan.targetResults.flatMap((target) =>
      target.viewportResults.flatMap((viewport) => viewport.errors),
    ),
  ].slice(0, 3),
  authState: "not reported",
});

const runtimeSummary = (
  latestReport: LatestReportResponse | null,
): RuntimeSummarySource | null => {
  if (latestReport?.state !== "valid") return null;
  if (latestReport.runtimeScanSummary) return fromSummary(latestReport.runtimeScanSummary);
  if (latestReport.runtimeScan) return fromRuntimeScan(latestReport.runtimeScan);
  if (latestReport.report.runtimeScan) return fromRuntimeScan(latestReport.report.runtimeScan);
  return null;
};

const statusStyle = (status?: string): string => {
  if (status === "failed") return "bg-[#fee2e2] text-[#b42318]";
  if (status === "warning") return "bg-[#fef3c7] text-[#a16207]";
  if (status === "passed") return "bg-[#dcfce7] text-[#15803d]";
  return "bg-[#e8f1ff] text-[#2563eb]";
};

function RuntimeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#f8fbff] p-3">
      <p className="text-xl font-semibold tracking-[-0.05em] text-[#111827]">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#667085]">{label}</p>
    </div>
  );
}

function SeverityPills({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return <p className="text-sm text-[#667085]">No runtime layout issues.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([severity, count]) => (
        <span
          key={severity}
          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#405168] shadow-[0_1px_0_#dbe7f5]"
        >
          {severity}: {count}
        </span>
      ))}
    </div>
  );
}

function RuntimeErrors({ errors }: { errors: RuntimeScanError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#fee2e2] bg-[#fff7f7] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b42318]">
        Runtime errors
      </p>
      <div className="mt-2 space-y-2">
        {errors.map((error, index) => (
          <div key={`${error.code}-${index}`} className="text-sm text-[#7f1d1d]">
            <span className="font-mono font-semibold">{error.code}</span>
            <span className="mx-2 text-[#d92d20]">—</span>
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuntimeSummaryCard({
  latestReport,
}: {
  latestReport: LatestReportResponse | null;
}) {
  const summary = runtimeSummary(latestReport);
  if (!summary) {
    return (
      <article className="rounded-[1.1rem] border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-4">
        <p className="text-sm font-semibold text-[#111827]">Runtime scan</p>
        <p className="mt-2 text-sm text-[#667085]">
          Runtime scan was not enabled for this report.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[1.1rem] border border-[#e5edf7] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_10px_22px_rgba(36,63,103,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Runtime scan</p>
          <p className="mt-1 max-w-xl truncate text-sm text-[#667085]">
            {summary.baseUrl ?? summary.artifactRef?.ref ?? "Latest runtime summary"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(summary.status)}`}>
          {summary.status ?? "summary"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <RuntimeStat label="Targets" value={summary.targetCount} />
        <RuntimeStat label="Viewports" value={summary.viewportCount} />
        <RuntimeStat label="Screenshots" value={summary.screenshotCount} />
        <RuntimeStat label="Layout issues" value={summary.issueCount} />
        <RuntimeStat label="Errors" value={summary.errorCount} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#f8fbff] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#667085]">
            Issue severity
          </p>
          <div className="mt-2">
            <SeverityPills counts={summary.bySeverity ?? emptySeverity} />
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8fbff] p-3 text-sm text-[#667085]">
          <p>
            <span className="font-semibold text-[#111827]">Scan ID:</span>{" "}
            {summary.scanId ?? summary.metaLabel ?? "summary-only"}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#111827]">Auth:</span>{" "}
            {summary.authState}
          </p>
          {summary.artifactRef ? (
            <p className="mt-1 truncate">
              <span className="font-semibold text-[#111827]">Artifact:</span>{" "}
              {summary.artifactRef.ref}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <RuntimeErrors errors={summary.errors} />
      </div>
    </article>
  );
}
