"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  LatestReportResponse,
  ProjectSummary,
  RuntimeArtifactDetailResponse,
  RuntimeScanRequest,
  StatusResponse,
} from "@lutest/contracts";
import {
  Activity,
  CheckCircle2,
  FileWarning,
  GitBranch,
  Globe2,
  Grid2X2,
  HardDrive,
  Heart,
  Laptop,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  PlayCircle,
  ScanSearch,
  Server,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { ProductionGraphCanvas } from "./production-graph-canvas";
import { RuntimeReportPanel } from "./runtime/runtime-report-panel";
import { RuntimeScanControls } from "./runtime/runtime-scan-controls";
import type { ProductionFlowModel } from "@/lib/production-graph-adapter";
import {
  runtimeScanRouteOptions,
  type RuntimeScanRouteOption,
} from "@/lib/runtime-scan-selection";
import { useDashboardData } from "@/lib/use-dashboard-data";
import {
  dashboardNavItems,
  DEFAULT_DASHBOARD_PAGE,
  type DashboardPage,
} from "@/lib/dashboard-navigation";

const pageIcons: Record<DashboardPage, LucideIcon> = {
  endpoint: Server,
  graph: GitBranch,
  reports: FileWarning,
  scans: ScanSearch,
  settings: Settings,
};

function formatStatus(status: StatusResponse | null) {
  if (!status) return "offline";
  return status.status === "ok" ? "live" : "error";
}

function formatFramework(project: ProjectSummary | null) {
  return project?.detectedFramework ?? "unknown";
}

function countIssues(report: LatestReportResponse | null) {
  return report?.state === "valid" ? report.report.issues.length : 0;
}

function latestReportLabel(report: LatestReportResponse | null) {
  if (!report) return ["no report", "empty"];
  if (report.state === "valid")
    return [report.report.scanId, report.report.status];
  return ["report unavailable", report.state];
}

function Sidebar({
  activePage,
  onPageChange,
}: {
  activePage: DashboardPage;
  onPageChange: (page: DashboardPage) => void;
}) {
  return (
    <aside className=" fixed inset-y-0 left-0 z-30 hidden w-[18rem] border-r border-[#dbe7f5] bg-white/92 px-5 py-6 shadow-[12px_0_50px_rgba(36,63,103,0.05)] backdrop-blur md:block">
      <Brand />
      <nav className="mt-8 space-y-2">
        {dashboardNavItems.map((item) => {
          const Icon = pageIcons[item.id];
          const active = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-controls="dashboard-content"
              aria-current={active ? "page" : undefined}
              onClick={() => onPageChange(item.id)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition ${
                active
                  ? "bg-[#e8f1ff] text-[#2563eb]"
                  : "text-[#526071] hover:bg-[#F4F4F5] hover:text-[#111827]"
              }`}
            >
              <Icon className="size-5 shrink-0 group-hover:text-[#2563eb]" />
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="block truncate text-xs text-[#758195]">
                  {item.purpose}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileSidebar({
  isOpen,
  activePage,
  onPageChange,
  onClose,
}: {
  isOpen: boolean;
  activePage: DashboardPage;
  onPageChange: (page: DashboardPage) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a]/30 md:hidden">
      <aside className="h-full w-[19rem] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#667085] hover:bg-[#f2f6fb]"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="mt-8 space-y-2">
          {dashboardNavItems.map((item) => {
            const Icon = pageIcons[item.id];
            const active = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-controls="dashboard-content"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onPageChange(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition ${
                  active
                    ? "bg-[#e8f1ff] text-[#2563eb]"
                    : "text-[#526071] hover:bg-[#f3f7fc]"
                }`}
              >
                <Icon className="size-5 group-hover:text-[#2563eb]" />
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)]">
        <Network className="size-5" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-[-0.04em] text-[#111827]">
          lutest
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]  text-[#6b7280]">
          v0.0.1
        </p>
      </div>
    </div>
  );
}

function Topbar({
  activePage,
  isScanning,
  onRunScan,
  onOpenMenu,
}: {
  activePage: DashboardPage;
  isScanning: boolean;
  onRunScan: () => void;
  onOpenMenu: () => void;
}) {
  const activeItem =
    dashboardNavItems.find((item) => item.id === activePage) ??
    dashboardNavItems[0];
  const ActiveIcon = pageIcons[activeItem.id];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-20 border-b border-[#dbe7f5] bg-white/85 px-4 backdrop-blur-xl md:left-[18rem] md:px-6 lg:px-10">
      <div className="mx-auto flex h-full max-w-[96rem] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid size-10 place-items-center rounded-xl border border-[#dbe7f5] bg-white text-[#111827] md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f1ff] text-[#2563eb]">
            <ActiveIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-[-0.04em] text-[#111827] sm:text-2xl">
              {activeItem.label}
            </h1>
            <p className="truncate text-sm text-[#667085]">
              {activeItem.purpose}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="hidden items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600 sm:inline-flex"
            type="button"
          >
            <Heart className="size-4" /> Donate
          </button>
          <button
            className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
            type="button"
            aria-label="Toggle theme"
          >
            <Moon className="size-5" />
          </button>
          <button
            className="hidden rounded-xl border border-[#dbe7f5] bg-white px-3 py-2 text-xs font-bold text-[#526071] sm:block"
            type="button"
            aria-label="Language"
          >
            US
          </button>
          <button
            className="hidden size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb] sm:grid"
            type="button"
            aria-label="Apps"
          >
            <Grid2X2 className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardNotice({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3 text-sm font-semibold text-[#526071]">
        Loading worker data...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        {error}
      </div>
    );
  }
  return null;
}

function PageTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-[#e8f1ff] text-[#2563eb]">
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#111827]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#667085]">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  meta,
}: {
  title: string;
  value: string | number;
  meta: string;
}) {
  return (
    <article className="rounded-[1.1rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_10px_22px_rgba(36,63,103,0.04)]">
      <p className="text-2xl font-semibold tracking-[-0.05em] text-[#111827]">
        {value}
      </p>
      <h3 className="mt-2 text-sm font-semibold tracking-[-0.03em] text-[#111827]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#667085]">{meta}</p>
    </article>
  );
}

function StatusRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: string;
}) {
  return (
    <div className="grid gap-3 rounded-2xl bg-[#f3f7fc] p-3 sm:grid-cols-[9rem_minmax(0,1fr)_6rem] sm:items-center">
      <span className="rounded-lg bg-white px-3 py-2 text-center font-mono text-xs text-[#64748b]">
        {label}
      </span>
      <code className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#283548]">
        {value}
      </code>
      <span className="rounded-full bg-white px-3 py-1 text-center text-xs font-bold text-[#2563eb]">
        {state ?? "ready"}
      </span>
    </div>
  );
}

function EndpointPage({
  status,
  project,
  latestReport,
  onRunScan,
  isScanning,
}: {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  latestReport: LatestReportResponse | null;
  onRunScan: () => void;
  isScanning: boolean;
}) {
  const [reportValue, reportState] = latestReportLabel(latestReport);
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <div className="grid gap-3">
        <StatusRow
          label="Worker"
          value={status?.service ?? "lutest-worker"}
          state={formatStatus(status)}
        />
        <StatusRow
          label="Runtime"
          value={status?.runtime ?? "node"}
          state={status ? "ready" : "unknown"}
        />
        <StatusRow
          label="Project root"
          value={project?.rootDir ?? "not loaded"}
          state={project ? "ready" : "empty"}
        />
        <StatusRow
          label="Latest report"
          value={reportValue}
          state={reportState}
        />
        <StatusRow
          label="Worker URL"
          value={
            process.env.NEXT_PUBLIC_LUTEST_WORKER_URL ?? "http://localhost:6532"
          }
          state="local"
        />
      </div>
    </section>
  );
}

function ProductionSummaryCards({
  graph,
  latestReport,
}: {
  graph: ProductionFlowModel | null;
  latestReport: LatestReportResponse | null;
}) {
  const summary = graph?.summary;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Source files"
        value={summary?.fileCount ?? 0}
        meta="supported files"
      />
      <MetricCard
        title="UI symbols"
        value={
          (summary?.pageCount ?? 0) +
          (summary?.componentCount ?? 0) +
          (summary?.hookCount ?? 0)
        }
        meta={`${summary?.pageCount ?? 0} pages / ${summary?.componentCount ?? 0} components / ${summary?.hookCount ?? 0} hooks`}
      />
      <MetricCard
        title="API flow"
        value={
          (summary?.apiClientMethodCount ?? 0) +
          (summary?.externalEndpointCount ?? 0)
        }
        meta={`${summary?.apiClientMethodCount ?? 0} clients / ${summary?.externalEndpointCount ?? 0} endpoints`}
      />
      <MetricCard
        title="Graph health"
        value={`${summary?.edgeCount ?? 0} edges`}
        meta={`${countIssues(latestReport)} issues`}
      />
    </div>
  );
}

function GraphPage({
  graph,
  latestReport,
}: {
  graph: ProductionFlowModel | null;
  latestReport: LatestReportResponse | null;
}) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <ProductionSummaryCards graph={graph} latestReport={latestReport} />
      <ProductionGraphCanvas graph={graph} />
    </div>
  );
}

function ReportsPage({
  latestReport,
  runtimeArtifactDetail,
  runtimeArtifactError,
}: {
  latestReport: LatestReportResponse | null;
  runtimeArtifactDetail: RuntimeArtifactDetailResponse | null;
  runtimeArtifactError: string | null;
}) {
  const staticIssues =
    latestReport?.state === "valid" ? latestReport.report.issues : [];
  return (
    <section className="p-4 sm:p-7">
      {runtimeArtifactError ? <div className="mb-4 rounded-xl border border-[#fde7b0] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#7a5a12]">Runtime evidence unavailable: {runtimeArtifactError}</div> : null}
      <RuntimeReportPanel
        latestReport={latestReport}
        runtimeArtifactDetail={runtimeArtifactDetail}
      />
      <section className="mt-5 rounded-2xl border border-[#dbe7f5] bg-[#f8fbff] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#111827]">
              Static code warnings
            </p>
            <p className="mt-0.5 text-xs text-[#667085]">
              Large files, console usage and other source-level findings.
            </p>
          </div>
          <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 text-xs font-bold tabular-nums text-[#a16207]">
            {staticIssues.length}
          </span>
        </div>
        {staticIssues.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[#f0fdf4] p-3 text-sm font-semibold text-[#15803d]">
            No static code warnings found.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {staticIssues.slice(0, 100).map((issue) => (
              <article
                key={issue.id}
                className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-mono text-xs font-bold text-[#111827]">
                    {issue.filePath ?? issue.type}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${issue.severity === "error" ? "bg-[#fee2e2] text-[#b42318]" : issue.severity === "warning" ? "bg-[#fef3c7] text-[#a16207]" : "bg-[#e8f1ff] text-[#2563eb]"}`}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[#405168]">{issue.message}</p>
                <p className="mt-1 font-mono text-[11px] text-[#7b8ba1]">
                  {issue.type}
                </p>
              </article>
            ))}
          </div>
        )}
        {staticIssues.length > 100 ? (
          <p className="mt-3 text-xs text-[#667085]">
            Showing 100 of {staticIssues.length} warnings.
          </p>
        ) : null}
      </section>
    </section>
  );
}

function ScansPage({
  status,
  project,
  latestReport,
  lastScan,
  routes,
  isScanning,
  onRunStaticScan,
  onRunRuntimeScan,
}: {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  latestReport: LatestReportResponse | null;
  lastScan: { status: string; scanId: string } | null;
  routes: RuntimeScanRouteOption[];
  isScanning: boolean;
  onRunStaticScan: () => Promise<void> | void;
  onRunRuntimeScan: (request: RuntimeScanRequest) => Promise<void> | void;
}) {
  const [reportValue, reportState] = latestReportLabel(latestReport);
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">

      <div className="grid gap-3">
        <StatusRow
          label="Worker"
          value={status?.service ?? "lutest-worker"}
          state={formatStatus(status)}
        />
        <StatusRow
          label="Project"
          value={project?.name ?? "not loaded"}
          state={project ? "ready" : "empty"}
        />
        <StatusRow
          label="Latest report"
          value={reportValue}
          state={reportState}
        />
        <StatusRow
          label="Last scan"
          value={lastScan?.scanId ?? "none"}
          state={lastScan?.status ?? "idle"}
        />
      </div>
      <div className="mt-5">
        <RuntimeScanControls
          routes={routes}
          isScanning={isScanning}
          onRunStaticScan={onRunStaticScan}
          onRunRuntimeScan={onRunRuntimeScan}
        />
      </div>
    </section>
  );
}

function SettingsPage({
  status,
  project,
}: {
  status: StatusResponse | null;
  project: ProjectSummary | null;
}) {
  const workerUrl =
    process.env.NEXT_PUBLIC_LUTEST_WORKER_URL ?? "http://localhost:6532";
  const runtimeBaseUrl =
    process.env.NEXT_PUBLIC_LUTEST_RUNTIME_BASE_URL ?? "http://localhost:3000";
  const workerLive = formatStatus(status) === "live";

  return (
    <section className="overflow-hidden text-[#111827] ">
      <div className="mx-auto grid max-w-[52rem] gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <SettingsCard
          icon={Laptop}
          title="Local Mode"
          accent="green"
          subtitle={
            workerLive
              ? "Worker is running on this machine"
              : "Worker is currently unavailable"
          }
          badge={workerLive ? "Live" : "Offline"}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsValue
              label="Project"
              value={project?.name ?? "Not loaded"}
              meta={formatFramework(project)}
            />
            <SettingsValue
              label="Worker"
              value={status?.service ?? "lutest-worker"}
              meta={status?.runtime ?? "node"}
            />
          </div>
          <div className="mt-3 rounded-xl border border-[#dbe7f5] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <HardDrive className="size-4 text-[#2563eb]" />
              Artifact Storage
            </div>
            <p className="mt-1 font-mono text-sm text-[#405168]">.lutest/</p>
            <p className="mt-1 text-xs text-[#7b8ba1]">
              Project-local, worker managed. Absolute filesystem paths stay
              hidden.
            </p>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Server}
          title="Runtime & Worker"
          accent="blue"
          subtitle="Local endpoints used by the dashboard"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsValue
              label="Worker Endpoint"
              value={workerUrl}
              meta="Dashboard API"
              mono
            />
            <SettingsValue
              label="Runtime Base URL"
              value={runtimeBaseUrl}
              meta="Local-only scan target"
              mono
            />
          </div>
          <PolicyRow label="Base URL policy" value="Localhost only" />
        </SettingsCard>

        <SettingsCard
          icon={Globe2}
          title="Preferences"
          accent="violet"
          subtitle="Current dashboard presentation"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsValue
              label="Display Language"
              value="English"
              meta="Current interface language"
            />
            <SettingsValue
              label="Appearance"
              value="System"
              meta="Follows the active Lutest interface"
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ShieldCheck}
          title="Security"
          accent="orange"
          subtitle="Enforced by the worker, not editable from the UI"
        >
          <div className="grid gap-2">
            <PolicyRow label="Allowed-root path policy" value="Enforced" />
            <PolicyRow label="Traversal and absolute refs" value="Rejected" />
            <PolicyRow
              label="Cookie, token and storage data"
              value="Redacted"
            />
            <PolicyRow label="Screenshot access" value="Opaque refs only" />
          </div>
        </SettingsCard>

        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-xs text-[#7b8ba1]">
          <span>Lutest local mode · data remains project-local</span>
          <span className="flex items-center gap-1.5">
            <LockKeyhole className="size-3.5" />
            Security policies are read-only
          </span>
        </footer>
      </div>
    </section>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  accent,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
  accent: "green" | "blue" | "violet" | "orange";
  children: ReactNode;
}) {
  const accentClass = {
    green: "bg-[#dcfce7] text-[#15803d]",
    blue: "bg-[#e8f1ff] text-[#2563eb]",
    violet: "bg-[#f3e8ff] text-[#7e22ce]",
    orange: "bg-[#ffedd5] text-[#c2410c]",
  }[accent];
  return (
    <article className="rounded-2xl border border-[#dbe7f5] bg-[#fbfdff] p-4 shadow-[0_1px_0_#e5edf7] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5edf7] pb-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${accentClass}`}
          >
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#111827]">{title}</h2>
            <p className="mt-0.5 text-sm text-[#667085]">{subtitle}</p>
          </div>
        </div>
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge === "Live" ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b42318]"}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="pt-4">{children}</div>
    </article>
  );
}

function SettingsValue({
  label,
  value,
  meta,
  mono = false,
}: {
  label: string;
  value: string;
  meta: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#dbe7f5] bg-white px-4 py-3">
      <p className="text-xs font-medium text-[#667085]">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold text-[#111827] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[#7b8ba1]">{meta}</p>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#e5edf7] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm text-[#405168]">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#15803d]">
        <CheckCircle2 className="size-4" />
        {value}
      </span>
    </div>
  );
}

export function DashboardShell() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<DashboardPage>(
    DEFAULT_DASHBOARD_PAGE,
  );
  const { data, isLoading, isScanning, error, runScan, runRuntimeScan } =
    useDashboardData();
  const runtimeRoutes = useMemo(
    () =>
      runtimeScanRouteOptions(data.productionGraph, data.runtimeArtifactDetail),
    [data.productionGraph, data.runtimeArtifactDetail],
  );
  const page = useMemo(() => {
    switch (activePage) {
      case "endpoint":
        return (
          <EndpointPage
            status={data.status}
            project={data.project}
            latestReport={data.latestReport}
            onRunScan={runScan}
            isScanning={isScanning}
          />
        );
      case "reports":
        return (
          <ReportsPage
            latestReport={data.latestReport}
            runtimeArtifactDetail={data.runtimeArtifactDetail}
            runtimeArtifactError={data.runtimeArtifactError}
          />
        );
      case "scans":
        return (
          <ScansPage
            status={data.status}
            project={data.project}
            latestReport={data.latestReport}
            lastScan={data.lastScan}
            routes={runtimeRoutes}
            isScanning={isScanning}
            onRunStaticScan={runScan}
            onRunRuntimeScan={runRuntimeScan}
          />
        );
      case "settings":
        return <SettingsPage status={data.status} project={data.project} />;
      case "graph":
      default:
        return (
          <GraphPage
            graph={data.productionGraphView}
            latestReport={data.latestReport}
          />
        );
    }
  }, [activePage, data, isScanning, runScan, runRuntimeScan, runtimeRoutes]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fbfdff] text-[#111827]">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        activePage={activePage}
        onPageChange={setActivePage}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <Topbar
        activePage={activePage}
        isScanning={isScanning}
        onRunScan={runScan}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
      />
      <main
        id="dashboard-content"
        className="min-h-dvh bg-[linear-gradient(#e5edf7_1px,transparent_1px),linear-gradient(90deg,#e5edf7_1px,transparent_1px)] bg-[size:50px_50px] px-4 pb-8 pt-24 md:ml-[18rem] md:px-6 lg:px-10"
      >
        <div className="mx-auto max-w-[96rem]">
          <div className="grid gap-5 sm:gap-6">
            <DashboardNotice isLoading={isLoading} error={error} />
            {page}
          </div>
        </div>
      </main>
    </div>
  );
}
