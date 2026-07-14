"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LatestReportResponse, RuntimeArtifactDetailResponse } from "@lutest/contracts";
import { AlertTriangle, Camera, Route as RouteIcon } from "lucide-react";
import { RuntimeScreenshotEvidence } from "./runtime-screenshot-evidence";
import {
  defaultRuntimeFilters,
  filterRuntimeIssues,
  runtimeReportViewModel,
  type RuntimeApiFailureView,
  type RuntimeIssueView,
  type RuntimeReportFilters,
  type RuntimeReportViewModel,
} from "@/lib/runtime-report-view-model";

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#667085]">
      {label}
      <select
        className="min-w-0 rounded-lg border border-[#dbe7f5] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus:border-[#93b4df] focus:ring-2 focus:ring-[#dbeafe]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}
      </select>
    </label>
  );
}

const statusClass = (status?: string) => {
  if (status === "failed" || status === "error") return "bg-[#fee2e2] text-[#b42318]";
  if (status === "warning") return "bg-[#fef3c7] text-[#a16207]";
  if (status === "passed") return "bg-[#dcfce7] text-[#15803d]";
  return "bg-[#e8f1ff] text-[#2563eb]";
};

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e5edf7] bg-white px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#2563eb]">{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums tracking-[-0.04em] text-[#111827]">{value}</p>
        <p className="truncate text-xs font-semibold text-[#405168]">{label}</p>
        <p className="truncate text-[11px] text-[#7b8ba1]">{detail}</p>
      </div>
    </div>
  );
}

function SeverityChart({ model }: { model: RuntimeReportViewModel }) {
  const errorCount = model.issueCountsBySeverity.error ?? 0;
  const warningCount = model.issueCountsBySeverity.warning ?? 0;
  const infoCount = model.issueCountsBySeverity.info ?? 0;
  const total = Math.max(1, errorCount + warningCount + infoCount);
  const errorEnd = (errorCount / total) * 100;
  const warningEnd = errorEnd + (warningCount / total) * 100;
  const chartBackground = model.issueCount === 0
    ? "#e5edf7"
    : `conic-gradient(#dc2626 0 ${errorEnd}%, #d97706 ${errorEnd}% ${warningEnd}%, #2563eb ${warningEnd}% 100%)`;

  return (
    <div className="flex items-center gap-5 rounded-xl bg-white p-4">
      <div
        className="relative grid size-28 shrink-0 place-items-center rounded-full"
        style={{ background: chartBackground }}
      >
        <div className="grid size-16 place-items-center rounded-full bg-white text-center">
          <span className="text-xl font-bold tabular-nums text-[#111827]">{model.issueCount}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-xs">
        <p className="font-bold uppercase tracking-[0.12em] text-[#667085]">Severity</p>
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#405168]"><span className="size-2 rounded-full bg-[#dc2626]" />Errors</span><strong className="tabular-nums text-[#111827]">{errorCount}</strong></div>
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#405168]"><span className="size-2 rounded-full bg-[#d97706]" />Warnings</span><strong className="tabular-nums text-[#111827]">{warningCount}</strong></div>
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[#405168]"><span className="size-2 rounded-full bg-[#2563eb]" />Info</span><strong className="tabular-nums text-[#111827]">{infoCount}</strong></div>
      </div>
    </div>
  );
}

function IssueTypeChart({ model }: { model: RuntimeReportViewModel }) {
  const issueTypes = Object.entries(model.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.type] = (counts[issue.type] ?? 0) + 1;
    return counts;
  }, {})).sort((left, right) => right[1] - left[1]);
  const maxCount = Math.max(1, ...issueTypes.map(([, count]) => count));

  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Issue types</p>
      {issueTypes.length === 0 ? <p className="mt-3 text-sm text-[#667085]">No visible layout issues.</p> : (
        <div className="mt-3 space-y-3">
          {issueTypes.slice(0, 6).map(([type, count]) => (
            <div key={type} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-semibold text-[#405168]">{type}</p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf2f7]">
                  <div className="h-full rounded-full bg-[#4f7fbf]" style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }} />
                </div>
              </div>
              <span className="text-right font-mono text-xs font-bold tabular-nums text-[#111827]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuntimeOverview({ model }: { model: RuntimeReportViewModel }) {
  const affectedRoutes = new Set(model.issues.map((issue) => issue.route)).size;
  const previewCount = model.screenshotArtifacts.filter((artifact) => artifact.available && artifact.safeRef).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe7f5] bg-[#f8fbff]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5edf7] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#111827]">Runtime overview</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass(model.status)}`}>{model.status ?? "unknown"}</span>
        </div>
        <p className="text-xs text-[#667085]">Scan {model.scanId ?? "latest"} · {model.viewportCount} viewports</p>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-3">
        <Metric icon={<AlertTriangle size={18} />} label="Visible issues" value={model.issueCount} detail={`${model.apiFailureCount} API failures · ${model.diagnosticCount} diagnostics`} />
        <Metric icon={<RouteIcon size={18} />} label="Affected routes" value={affectedRoutes} detail={`${model.targetCount} targets scanned`} />
        <Metric icon={<Camera size={18} />} label="Safe previews" value={previewCount} detail={`${model.screenshotCount} captured`} />
      </div>
      <div className="grid gap-3 border-t border-[#e5edf7] p-3 lg:grid-cols-[0.75fr_1.25fr]">
        <SeverityChart model={model} />
        <IssueTypeChart model={model} />
      </div>
    </section>
  );
}

function RuntimeErrorList({ model }: { model: RuntimeReportViewModel }) {
  if (model.errors.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#fee2e2] bg-[#fff7f7] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b42318]">Scanner failures</p>
      {model.errors.slice(0, 3).map((error, index) => (
        <p key={`${error.code}-${index}`} className="mt-1.5 text-sm text-[#7f1d1d]"><span className="font-mono font-semibold">{error.code}</span><span className="mx-2">—</span>{error.message}</p>
      ))}
    </div>
  );
}

function RuntimeIssueSelect({ issues, selectedId, onSelect }: { issues: RuntimeIssueView[]; selectedId?: string; onSelect: (issue: RuntimeIssueView) => void }) {
  if (issues.length === 0) return null;
  return (
    <label className="grid min-w-0 gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#667085]">
      Inspect issue · {issues.length}
      <select
        className="min-w-0 rounded-xl border border-[#b9cee8] bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus:border-[#5f8fc9] focus:ring-2 focus:ring-[#dbeafe]"
        value={selectedId ?? issues[0]?.id}
        onChange={(event) => {
          const issue = issues.find((candidate) => candidate.id === event.target.value);
          if (issue) onSelect(issue);
        }}
      >
        {issues.map((issue, index) => (
          <option key={issue.id} value={issue.id}>{index + 1}. [{issue.severity}] {issue.type} · {issue.route} · {issue.stateLabel} · {issue.viewportKey} · {issue.selectorHint ?? issue.elementRef}</option>
        ))}
      </select>
    </label>
  );
}

function InteractionDiscoverySummary({ model }: { model: RuntimeReportViewModel }) {
  const stateLabels = Array.from(new Set(model.states.map((state) => state.label)));
  const discoveredStates = model.states.filter((state) => state.label !== "baseline");
  const discoveredViewportCount = new Set(discoveredStates.map((state) => state.viewportKey)).size;
  const viewportPresetCount = new Set(model.states.map((state) => state.viewportKey)).size;
  if (stateLabels.length <= 1) return null;
  return (
    <div className="mt-3 rounded-xl border border-[#dbe7f5] bg-[#fbfdff] px-3 py-3 text-sm text-[#405168]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-[#111827]">Unique states: {Math.max(0, stateLabels.length - (stateLabels.includes("baseline") ? 1 : 0))}</span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#667085]">snapshots · {discoveredStates.length}</span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#667085]">viewport coverage · {discoveredViewportCount}/{viewportPresetCount}</span>
      </div>
    </div>
  );
}

function BrowserDiagnostics({ model }: { model: RuntimeReportViewModel }) {
  if (model.diagnostics.length === 0) return null;
  const grouped = Array.from(model.diagnostics.reduce<Map<string, { kind: string; message: string; count: number }>>((groups, diagnostic) => {
    const key = `${diagnostic.kind}:${diagnostic.message}`;
    const current = groups.get(key);
    groups.set(key, current ? { ...current, count: current.count + 1 } : { kind: diagnostic.kind, message: diagnostic.message, count: 1 });
    return groups;
  }, new Map()).values());
  return (
    <section className="rounded-xl border border-[#fde7b0] bg-[#fffaf0] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a6700]">Browser diagnostics</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold tabular-nums text-[#9a6700]">{model.diagnosticCount} events</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {grouped.map((diagnostic) => (
          <div key={`${diagnostic.kind}:${diagnostic.message}`} className="rounded-lg border border-[#f5dfaa] bg-white px-3 py-2 text-xs">
            <p className="font-mono font-semibold text-[#9a6700]">{diagnostic.kind}{diagnostic.count > 1 ? ` · ×${diagnostic.count}` : ""}</p>
            <p className="mt-1 break-words text-[#5f4b22]">{diagnostic.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApiFailureCard({ failure }: { failure: RuntimeApiFailureView }) {
  const statusLabel = failure.status ? `HTTP ${failure.status}` : failure.kind === "network-error" ? "Network" : "HTTP";
  const statusClassName = failure.status && failure.status >= 500 ? "bg-[#fee2e2] text-[#b42318]" : failure.status && failure.status >= 400 ? "bg-[#ffedd5] text-[#c2410c]" : "bg-[#eef5ff] text-[#2563eb]";
  return (
    <div className="rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 font-bold ${statusClassName}`}>{statusLabel}</span>
        {failure.method ? <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 font-mono font-bold text-[#475467]">{failure.method}</span> : null}
        <span className="font-mono font-semibold text-[#111827]">{failure.endpoint}</span>
        {failure.observationCount > 1 ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-bold text-[#c2410c]">×{failure.observationCount}</span> : null}
      </div>
      <p className="mt-1 break-words text-[#7f1d1d]">{failure.message}</p>
      <p className="mt-1 font-mono text-[11px] text-[#98a2b3]">{failure.route} · {failure.stateLabel} · {failure.viewportKey}</p>
    </div>
  );
}

function ApiFailures({ model }: { model: RuntimeReportViewModel }) {
  if (model.apiFailures.length === 0) return null;
  return (
    <section className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b42318]">API failures</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold tabular-nums text-[#b42318]">{model.apiFailureCount} failures</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {model.apiFailures.slice(0, 12).map((failure) => <ApiFailureCard key={failure.id} failure={failure} />)}
      </div>
      {model.apiFailures.length > 12 ? <p className="mt-2 text-xs font-semibold text-[#991b1b]">Showing 12 of {model.apiFailures.length} API failures.</p> : null}
    </section>
  );
}

function ReadabilityCoverageSummary({ model }: { model: RuntimeReportViewModel }) {
  if (model.readabilityCheckedCount === 0 && model.readabilitySkippedCount === 0 && model.readabilityIncompleteViewportCount === 0) return null;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${model.readabilitySkippedCount > 0 || model.readabilityIncompleteViewportCount > 0 ? "border-[#fde7b0] bg-[#fffaf0] text-[#7a5a12]" : "border-[#d7eadf] bg-[#f4fbf6] text-[#24613a]"}`}>
      <strong>Contrast coverage:</strong> {model.readabilityCheckedCount} text elements checked
      {model.readabilitySkippedCount > 0 ? ` · ${model.readabilitySkippedCount} skipped because the visual background could not be measured reliably` : ""}
      {model.readabilityIncompleteViewportCount > 0 ? ` · ${model.readabilityIncompleteViewportCount} snapshots reached the DOM capture limit` : ""}
    </div>
  );
}

export function RuntimeReportPanel({ latestReport, runtimeArtifactDetail }: { latestReport: LatestReportResponse | null; runtimeArtifactDetail: RuntimeArtifactDetailResponse | null }) {
  const model = useMemo(() => runtimeReportViewModel(latestReport, runtimeArtifactDetail), [latestReport, runtimeArtifactDetail]);
  const [filters, setFilters] = useState<RuntimeReportFilters>(defaultRuntimeFilters);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>();
  const filteredIssues = useMemo(() => filterRuntimeIssues(model.issues, filters), [filters, model.issues]);
  const selectedIssue = filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0] ?? null;
  const routes = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.route)))], [model.issues]);
  const states = useMemo(() => ["all", ...Array.from(new Set(model.states.map((state) => state.label)))], [model.states]);
  const viewports = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.viewportKey)))], [model.issues]);
  const severities = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.severity)))], [model.issues]);

  if (!model.runtimeEnabled) {
    return <section className="rounded-xl border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-4 text-sm text-[#667085]">Runtime scan was not enabled for this report.</section>;
  }

  return (
    <section className="space-y-3">
      <RuntimeOverview model={model} />
      {!model.hasFullIssueData ? <div className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4 text-sm text-[#a16207]">Detailed runtime issues are not available in this report.</div> : null}
      <RuntimeErrorList model={model} />
      <ApiFailures model={model} />
      <BrowserDiagnostics model={model} />
      <ReadabilityCoverageSummary model={model} />

      {model.hasFullIssueData ? (
        <section className="rounded-2xl border border-[#dbe7f5] bg-white p-3 sm:p-4">
          <InteractionDiscoverySummary model={model} />
          {model.issues.length === 0 ? (
            <p className="rounded-xl bg-[#f0fdf4] p-4 text-sm font-semibold text-[#15803d]">No visible runtime layout issues found.</p>
          ) : (
            <>
              <div className="mt-3 grid gap-3 rounded-xl bg-[#f8fbff] p-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.25fr)_1fr_1fr_1fr_auto] xl:items-end">
                <SelectField label="Affected route" value={filters.route} options={routes} onChange={(route) => { setFilters((current) => ({ ...current, route })); setSelectedIssueId(undefined); }} />
                <SelectField label="State" value={filters.state} options={states} onChange={(state) => { setFilters((current) => ({ ...current, state })); setSelectedIssueId(undefined); }} />
                <SelectField label="Viewport" value={filters.viewport} options={viewports} onChange={(viewport) => { setFilters((current) => ({ ...current, viewport })); setSelectedIssueId(undefined); }} />
                <SelectField label="Severity" value={filters.severity} options={severities} onChange={(severity) => { setFilters((current) => ({ ...current, severity })); setSelectedIssueId(undefined); }} />
                <button type="button" onClick={() => { setFilters(defaultRuntimeFilters); setSelectedIssueId(undefined); }} className="rounded-lg border border-[#dbe7f5] bg-white px-3 py-2 text-sm font-semibold text-[#405168] hover:border-[#a9c2df]">Reset</button>
              </div>
              {filteredIssues.length === 0 ? <p className="mt-3 rounded-xl bg-[#fffbeb] p-4 text-sm text-[#a16207]">No runtime issues match these filters.</p> : (
                <div className="mt-3">
                  <RuntimeIssueSelect issues={filteredIssues} selectedId={selectedIssue?.id} onSelect={(issue) => setSelectedIssueId(issue.id)} />
                </div>
              )}
              {selectedIssue ? (
                <div className="mt-4">
                  <RuntimeScreenshotEvidence key={`${selectedIssue.id}:${selectedIssue.screenshotRef ?? selectedIssue.screenshotMissingReason ?? "missing"}`} issue={selectedIssue} />
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}
