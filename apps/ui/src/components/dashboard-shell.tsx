"use client";

import { useMemo, useState } from "react";
import type {
  LatestReportResponse,
  ProjectSummary,
  RuntimeArtifactDetailResponse,
  StatusResponse,
} from "@lutest/contracts";
import {
  Activity,
  FileWarning,
  FolderGit2,
  GitBranch,
  Grid2X2,
  Heart,
  Menu,
  Moon,
  Network,
  PlayCircle,
  ScanSearch,
  Server,
  Settings,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import { ProductionGraphCanvas } from "./production-graph-canvas";
import { RuntimeReportPanel } from "./runtime/runtime-report-panel";
import { RuntimeSummaryCard } from "./runtime/runtime-summary-card";
import type { ProductionFlowModel } from "@/lib/production-graph-adapter";
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
          <button
            type="button"
            onClick={onRunScan}
            disabled={isScanning}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <PlayCircle className="size-4" />
            <span className="hidden sm:inline">
              {isScanning ? "Scanning..." : "Run scan"}
            </span>
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
      <PageTitle
        icon={Server}
        title="Worker endpoint"
        subtitle="Read-only local Express worker status."
      />
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
      <button
        type="button"
        onClick={onRunScan}
        disabled={isScanning}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlayCircle className="size-4" />{" "}
        {isScanning ? "Scanning..." : "Run scan"}
      </button>
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
  isScanning,
  onRunRuntimeScan,
}: {
  latestReport: LatestReportResponse | null;
  runtimeArtifactDetail: RuntimeArtifactDetailResponse | null;
  isScanning: boolean;
  onRunRuntimeScan: () => void;
}) {
  const report = latestReport?.state === "valid" ? latestReport.report : null;
  const issues = report?.issues ?? [];
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          icon={FileWarning}
          title="Reports"
          subtitle="Latest scan report and issue list."
        />
        <button
          type="button"
          onClick={onRunRuntimeScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlayCircle className="size-4" />
          {isScanning ? "Scanning runtime..." : "Run runtime scan"}
        </button>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Scan"
          value={report?.scanId ?? "none"}
          meta={report?.status ?? "No report yet"}
        />
        <MetricCard
          title="Issues"
          value={issues.length}
          meta="current report"
        />
        <MetricCard
          title="State"
          value={latestReport?.state ?? "empty"}
          meta="report availability"
        />
      </div>
      <div className="mb-5">
        <RuntimeSummaryCard latestReport={latestReport} />
      </div>
      <div className="mb-5">
        <RuntimeReportPanel latestReport={latestReport} runtimeArtifactDetail={runtimeArtifactDetail} />
      </div>
      <div className="space-y-3">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 truncate font-mono text-sm text-[#111827]">
                  {issue.filePath ?? issue.type}
                </p>
                <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#a16207]">
                  {issue.severity}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#c98216]">
                {issue.message}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#667085]">No issues to show.</p>
        )}
      </div>
    </section>
  );
}

function ScansPage({
  status,
  project,
  latestReport,
  lastScan,
  isScanning,
  onRunScan,
}: {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  latestReport: LatestReportResponse | null;
  lastScan: { status: string; scanId: string } | null;
  isScanning: boolean;
  onRunScan: () => void;
}) {
  const [reportValue, reportState] = latestReportLabel(latestReport);
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <PageTitle
        icon={ScanSearch}
        title="Scans"
        subtitle="Run production scan and inspect latest run state."
      />
      <div className="grid gap-3">
        <StatusRow
          label="Worker"
          value={status?.service ?? "lutest-worker"}
          state={formatStatus(status)}
        />
        <StatusRow
          label="Project"
          value={project?.rootDir ?? "not loaded"}
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
      <button
        type="button"
        onClick={onRunScan}
        disabled={isScanning}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlayCircle className="size-4" />{" "}
        {isScanning ? "Scanning..." : "Run scan"}
      </button>
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
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <PageTitle
        icon={Settings}
        title="Settings"
        subtitle="Read-only placeholders until worker exposes config APIs."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingCard
          icon={FolderGit2}
          title="Project"
          rows={[
            ["Root", project?.rootDir ?? "not loaded"],
            ["Framework", formatFramework(project)],
          ]}
        />
        <SettingCard
          icon={Activity}
          title="Worker"
          rows={[
            ["Service", status?.service ?? "lutest-worker"],
            ["Runtime", status?.runtime ?? "node"],
            [
              "URL",
              process.env.NEXT_PUBLIC_LUTEST_WORKER_URL ??
                "http://localhost:6532",
            ],
          ]}
        />
        <SettingCard
          icon={Moon}
          title="Appearance"
          rows={[
            ["Theme", "system placeholder"],
            ["Persistence", "not implemented"],
          ]}
        />
        <SettingCard
          icon={Shield}
          title="Security"
          rows={[
            ["Auth", "coming soon"],
            ["Password", "not implemented"],
          ]}
        />
      </div>
    </section>
  );
}

function SettingCard({
  icon: Icon,
  title,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <article className="rounded-2xl border border-[#dbe7f5] bg-[#fbfdff] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#111827]">
        <Icon className="size-4 text-[#2563eb]" /> {title}
      </h3>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <StatusRow
            key={label}
            label={label}
            value={value}
            state="read-only"
          />
        ))}
      </div>
    </article>
  );
}

export function DashboardShell() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<DashboardPage>(
    DEFAULT_DASHBOARD_PAGE,
  );
  const { data, isLoading, isScanning, error, runScan, runRuntimeScan } = useDashboardData();
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
            isScanning={isScanning}
            onRunRuntimeScan={runRuntimeScan}
          />
        );
      case "scans":
        return (
          <ScansPage
            status={data.status}
            project={data.project}
            latestReport={data.latestReport}
            lastScan={data.lastScan}
            isScanning={isScanning}
            onRunScan={runScan}
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
  }, [activePage, data, isScanning, runScan, runRuntimeScan]);

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
      <main className="min-h-dvh bg-[linear-gradient(#e5edf7_1px,transparent_1px),linear-gradient(90deg,#e5edf7_1px,transparent_1px)] bg-[size:50px_50px] px-4 pb-8 pt-24 md:ml-[18rem] md:px-6 lg:px-10">
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

