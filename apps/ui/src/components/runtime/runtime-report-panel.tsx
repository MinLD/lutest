"use client";

import { useMemo, useState } from "react";
import type { LatestReportResponse } from "@lutest/contracts";
import {
  defaultRuntimeFilters,
  filterRuntimeIssues,
  runtimeReportViewModel,
  viewportKey,
  type RuntimeIssueView,
  type RuntimeReportFilters,
  type RuntimeReportViewModel,
} from "@/lib/runtime-report-view-model";

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

const statusClass = (status?: string) => {
  if (status === "failed") return "bg-[#fee2e2] text-[#b42318]";
  if (status === "warning") return "bg-[#fef3c7] text-[#a16207]";
  if (status === "passed") return "bg-[#dcfce7] text-[#15803d]";
  return "bg-[#e8f1ff] text-[#2563eb]";
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">
      {label}
      <select
        className="rounded-xl border border-[#dbe7f5] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#111827]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option === "all" ? "All" : option}</option>
        ))}
      </select>
    </label>
  );
}

function RuntimeErrorList({ model }: { model: RuntimeReportViewModel }) {
  if (model.errors.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#fee2e2] bg-[#fff7f7] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b42318]">Top runtime errors</p>
      <div className="mt-2 space-y-2">
        {model.errors.map((error, index) => (
          <p key={`${error.code}-${index}`} className="text-sm text-[#7f1d1d]">
            <span className="font-mono font-semibold">{error.code}</span>
            <span className="mx-2 text-[#d92d20]">—</span>
            {error.message}
          </p>
        ))}
      </div>
    </div>
  );
}

function RuntimeTargets({ model }: { model: RuntimeReportViewModel }) {
  if (model.targets.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
      <p className="text-sm font-semibold text-[#111827]">Targets/routes scanned</p>
      <div className="mt-3 grid gap-2">
        {model.targets.slice(0, 8).map((target) => (
          <div key={target.id} className="grid gap-2 rounded-xl bg-white p-3 text-sm shadow-[0_1px_0_#dbe7f5] md:grid-cols-[1fr_1fr_auto_auto]">
            <span className="font-mono text-[#111827]">{target.id}</span>
            <span className="truncate text-[#667085]">{target.route}</span>
            <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${statusClass(target.status)}`}>{target.status}</span>
            <span className="text-[#667085]">{target.issueCount} issues / {target.viewportCount} viewports</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimeViewports({ model }: { model: RuntimeReportViewModel }) {
  if (model.viewports.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
      <p className="text-sm font-semibold text-[#111827]">Viewports scanned</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {model.viewports.slice(0, 12).map((viewport) => (
          <div key={viewport.key} className="rounded-xl bg-white p-3 text-sm shadow-[0_1px_0_#dbe7f5]">
            <p className="font-mono font-semibold text-[#111827]">{viewportKey(viewport.viewport)}</p>
            <p className="mt-1 truncate text-[#667085]">{viewport.route}</p>
            <p className="mt-1 text-[#667085]">{viewport.issueCount} issues · screenshot {viewport.screenshotAvailable ? "available" : "missing"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimeIssueList({ issues, selectedId, onSelect }: { issues: RuntimeIssueView[]; selectedId?: string; onSelect: (issue: RuntimeIssueView) => void }) {
  if (issues.length === 0) return <p className="rounded-2xl bg-[#fbfdff] p-4 text-sm text-[#667085]">No runtime issues match these filters.</p>;
  return (
    <div className="space-y-2">
      {issues.slice(0, 100).map((issue) => (
        <button
          key={issue.id}
          type="button"
          onClick={() => onSelect(issue)}
          className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === issue.id ? "border-[#2563eb] bg-[#eff6ff]" : "border-[#e5edf7] bg-[#fbfdff] hover:bg-white"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm font-semibold text-[#111827]">{issue.type}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(issue.severity === "error" ? "failed" : issue.severity === "warning" ? "warning" : "passed")}`}>{issue.severity}</span>
          </div>
          <p className="mt-2 text-sm text-[#405168]">{issue.message}</p>
          <p className="mt-2 truncate text-xs font-semibold text-[#667085]">{issue.scanTargetId} · {issue.route} · {issue.viewportKey}</p>
        </button>
      ))}
      {issues.length > 100 ? <p className="text-sm text-[#667085]">Showing 100 of {issues.length} runtime issues.</p> : null}
    </div>
  );
}

function RuntimeIssueDetail({ issue }: { issue: RuntimeIssueView | null }) {
  if (!issue) return <div className="rounded-2xl border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-4 text-sm text-[#667085]">Select a runtime issue to view details.</div>;
  return (
    <div className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-[0_1px_0_#dbe7f5]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-[#111827]">{issue.type}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(issue.severity === "error" ? "failed" : issue.severity === "warning" ? "warning" : "passed")}`}>{issue.severity}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-[#405168]">{issue.message}</p>
      <dl className="mt-4 grid gap-2 text-sm text-[#667085]">
        <div><dt className="font-semibold text-[#111827]">Target</dt><dd className="font-mono">{issue.scanTargetId}</dd></div>
        <div><dt className="font-semibold text-[#111827]">Route</dt><dd>{issue.route}</dd></div>
        <div><dt className="font-semibold text-[#111827]">Viewport</dt><dd>{issue.viewport.width} × {issue.viewport.height}</dd></div>
        <div><dt className="font-semibold text-[#111827]">Element</dt><dd className="break-words font-mono">{issue.selectorHint ?? issue.elementRef}</dd></div>
        <div><dt className="font-semibold text-[#111827]">Bounding box</dt><dd>x {issue.boundingBox.x}, y {issue.boundingBox.y}, w {issue.boundingBox.width}, h {issue.boundingBox.height}</dd></div>
        <div><dt className="font-semibold text-[#111827]">Evidence</dt><dd>{issue.threshold}</dd></div>
        {issue.relatedElementRef ? <div><dt className="font-semibold text-[#111827]">Related element</dt><dd className="break-words font-mono">{issue.relatedSelectorHint ?? issue.relatedElementRef}</dd></div> : null}
        {issue.overlapRatio !== undefined ? <div><dt className="font-semibold text-[#111827]">Overlap</dt><dd>{issue.overlapRatio} ratio{issue.overlapArea !== undefined ? ` · ${issue.overlapArea} px²` : ""}</dd></div> : null}
        <div><dt className="font-semibold text-[#111827]">Screenshot</dt><dd>{issue.screenshotRef ?? "available only as safe artifact metadata or unavailable"}</dd></div>
      </dl>
    </div>
  );
}

export function RuntimeReportPanel({ latestReport }: { latestReport: LatestReportResponse | null }) {
  const model = useMemo(() => runtimeReportViewModel(latestReport), [latestReport]);
  const [filters, setFilters] = useState<RuntimeReportFilters>(defaultRuntimeFilters);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>();
  const filteredIssues = useMemo(() => filterRuntimeIssues(model.issues, filters), [model.issues, filters]);
  const selectedIssue = filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0] ?? null;
  const targets = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.scanTargetId)))], [model.issues]);
  const routes = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.route)))], [model.issues]);
  const viewports = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.viewportKey)))], [model.issues]);
  const severities = useMemo(() => ["all", ...Array.from(new Set(model.issues.map((issue) => issue.severity)))], [model.issues]);

  if (!model.runtimeEnabled) {
    return <section className="rounded-[1.1rem] border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-4 text-sm text-[#667085]">Runtime scan was not enabled for this report.</section>;
  }

  return (
    <section className="space-y-4">
      {!model.hasFullIssueData ? <div className="rounded-2xl border border-[#fef3c7] bg-[#fffbeb] p-4 text-sm text-[#a16207]">Detailed runtime issues are not available in this report.</div> : null}
      <RuntimeErrorList model={model} />
      <RuntimeTargets model={model} />
      <RuntimeViewports model={model} />
      {model.hasFullIssueData ? (
        <div className="rounded-2xl border border-[#e5edf7] bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Runtime issues</p>
              <p className="mt-1 text-sm text-[#667085]">Showing {filteredIssues.length} of {model.issues.length} issues.</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
              <SelectField label="Target" value={filters.targetId} options={targets} onChange={(targetId) => { setFilters((current) => ({ ...current, targetId })); setSelectedIssueId(undefined); }} />
              <SelectField label="Route" value={filters.route} options={routes} onChange={(route) => { setFilters((current) => ({ ...current, route })); setSelectedIssueId(undefined); }} />
              <SelectField label="Viewport" value={filters.viewport} options={viewports} onChange={(viewport) => { setFilters((current) => ({ ...current, viewport })); setSelectedIssueId(undefined); }} />
              <SelectField label="Severity" value={filters.severity} options={severities} onChange={(severity) => { setFilters((current) => ({ ...current, severity })); setSelectedIssueId(undefined); }} />
            </div>
          </div>
          {model.issues.length === 0 ? <p className="mt-4 rounded-2xl bg-[#fbfdff] p-4 text-sm text-[#667085]">No runtime layout issues found for this report.</p> : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <RuntimeIssueList issues={filteredIssues} selectedId={selectedIssue?.id} onSelect={(issue) => setSelectedIssueId(issue.id)} />
            <RuntimeIssueDetail issue={selectedIssue} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
