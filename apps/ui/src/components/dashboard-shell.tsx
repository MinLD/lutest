"use client";

import { useState } from "react";
import type {
  GraphResponse,
  LatestReportResponse,
  ProjectSummary,
  StatusResponse,
} from "@lutest/contracts";
import { BugOff, ChevronUp, Grid2X2, Menu, Moon, Rose, X } from "lucide-react";
import { useDashboardData } from "@/lib/use-dashboard-data";

const navPrimary: [string, string, boolean][] = [
  ["Endpoint", "⌘", true],
  ["Providers", "▤", false],
  ["Combos", "◇", false],
  ["Usage", "▥", false],
];

const groupedNav = [
  { label: "Project", icon: "▧", items: ["Maps", "Rules", "Reports"] },
  { label: "Runtime", icon: "▣", items: ["Console", "Workers", "Settings"] },
];

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
  if (report.state === "valid") return [report.report.scanId, report.report.status];

  return [
    report.error?.message ?? "report unavailable",
    report.state,
  ];
}

function BrandMark() {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-[0.9rem] bg-[#2563eb] text-white shadow-[0_10px_28px_rgba(37,99,235,0.24)] sm:size-11">
      <BugOff className="size-5 sm:size-6" />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[18.5rem] overflow-hidden border-r border-[#dbe7f5] bg-[#fbfdff]/95 px-5 py-3 backdrop-blur md:block xl:w-[18rem]">
      <div className="flex items-center gap-2 pt-2 pb-5">
        <div className="h-3 w-3 rounded-full bg-[#FF5F56]" />
        <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
        <div className="h-3 w-3 rounded-full bg-[#27C93F]" />
      </div>
      <div className="mb-9 flex items-center gap-4">
        <BrandMark />
        <div>
          <p className="text-[1.35rem] font-semibold tracking-[-0.04em] text-[#111827]">
            Lutest
          </p>
          <p className="text-sm font-medium text-[#6b7280]">scan console</p>
        </div>
      </div>

      <nav className="space-y-5" aria-label="Dashboard navigation">
        <NavGroup items={navPrimary} />
        <NavDetails />
      </nav>
    </aside>
  );
}

function NavGroup({ items }: { items: [string, string, boolean][] }) {
  return (
    <div className="space-y-1.5">
      {items.map(([label, icon, active]) => (
        <a
          key={label}
          href="#"
          className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[0.95rem] font-semibold transition duration-200 ${
            active
              ? "bg-[#e8f1ff] text-[#2563eb]"
              : "text-[#6b7280] hover:bg-[#f2f6fb] hover:text-[#111827]"
          }`}
        >
          <span className="grid size-6 place-items-center text-[1.25rem] leading-none">
            {icon}
          </span>
          {label}
        </a>
      ))}
    </div>
  );
}

function NavDetails({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-2">
      {groupedNav.map((group) => (
        <details
          key={group.label}
          className="group rounded-xl open:pb-2"
          open={group.label === "Project"}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3.5 py-3 text-[0.95rem] font-semibold text-[#4b5563] transition hover:bg-[#f2f6fb] hover:text-[#111827] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="grid size-6 place-items-center text-[1.2rem] leading-none">
                {group.icon}
              </span>
              {group.label}
            </span>
            <ChevronUp className="size-5 transition group-open:rotate-180" />
          </summary>
          <div className="ml-12 space-y-1.5 pr-2">
            {group.items.map((item) => (
              <a
                key={item}
                href="#"
                onClick={onNavigate}
                className="block rounded-lg px-2.5 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f2f6fb] hover:text-[#111827]"
              >
                {item}
              </a>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-40 md:hidden ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close navigation overlay"
        onClick={onClose}
        className={`absolute inset-0 bg-[#111827]/35 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 w-[19.5rem] max-w-[86vw] border-r border-[#dbe7f5] bg-[#fbfdff] px-5 py-6 shadow-2xl transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-[1.25rem] font-semibold tracking-[-0.04em] text-[#111827]">
                Lutest
              </p>
              <p className="text-sm font-medium text-[#6b7280]">scan console</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="space-y-5" aria-label="Mobile dashboard navigation">
          <NavGroup items={navPrimary} />
          <NavDetails onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex h-[4.7rem] items-center justify-between border-b border-[#dbe7f5] bg-white/92 px-4 backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenMenu}
          className="grid size-10 place-items-center rounded-xl text-[#111827] transition hover:bg-[#f2f6fb]"
        >
          <Menu className="size-6" />
        </button>
        <BrandMark />
        <p className="text-lg font-semibold tracking-[-0.04em] text-[#111827]">
          Endpoint
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600">
          <Rose /> Donate
        </button>
        <button
          type="button"
          aria-label="Toggle theme"
          className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
        >
          <Moon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Open apps"
          className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
        >
          <Grid2X2 className="size-5" />
        </button>
      </div>
    </header>
  );
}

function Topbar({
  project,
  isScanning,
  onRunScan,
}: {
  project: ProjectSummary | null;
  isScanning: boolean;
  onRunScan: () => void;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:mb-11 lg:flex-row lg:items-start">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2563eb]">
          <span className="text-xl">✥</span> dashboard
        </p>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-[-0.05em] text-[#0f172a] sm:text-5xl">
          Map project routes, checks, and Express worker health.
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-[#5f6b7a] sm:text-lg">
          {project
            ? `${project.name} · ${formatFramework(project)} · ${
                project.sourceFileCount ?? 0
              } source files`
            : "Connect to local worker to inspect project graph and scan report."}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-bold text-pink-600">
          <Rose /> Donate
        </button>
        <button
          type="button"
          aria-label="Toggle theme"
          className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
        >
          <Moon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Open apps"
          className="grid size-10 place-items-center rounded-xl text-[#667085] transition hover:bg-[#f2f6fb]"
        >
          <Grid2X2 className="size-5" />
        </button>
        <button
          type="button"
          onClick={onRunScan}
          disabled={isScanning}
          className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? "Scanning..." : "Run scan"}
        </button>
      </div>
    </header>
  );
}

function EndpointPanel({
  status,
  project,
  latestReport,
}: {
  status: StatusResponse | null;
  project: ProjectSummary | null;
  latestReport: LatestReportResponse | null;
}) {
  const [latestReportValue, latestReportState] = latestReportLabel(latestReport);
  const rows = [
    ["Worker", status?.service ?? "lutest-worker", formatStatus(status)],
    ["Runtime", status?.runtime ?? "node", status ? "ready" : "unknown"],
    ["Project", project?.rootDir ?? "not loaded", project ? "ready" : "empty"],
    ["Latest report", latestReportValue, latestReportState],
  ];

  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <SectionTitle
        icon="⌁"
        title="API endpoints"
        subtitle="Live data from local Express worker"
      />

      <div className="mt-6 space-y-3 sm:mt-7">
        {rows.map(([label, value, state]) => (
          <div
            key={label}
            className="grid gap-3 rounded-2xl bg-[#f3f7fc] p-3 sm:grid-cols-[8rem_minmax(0,1fr)_5rem] sm:items-center"
          >
            <span className="rounded-lg bg-white px-3 py-2 text-center font-mono text-xs text-[#64748b]">
              {label}
            </span>
            <code className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white/45 px-3 py-2 font-mono text-sm text-[#111827] sm:bg-transparent sm:px-1 sm:py-0">
              {value}
            </code>
            <span className="w-fit rounded-full bg-[#e6f7ee] px-3 py-1 text-xs font-bold text-[#0d9b51] sm:justify-self-end">
              {state}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProviderGrid({
  graph,
  latestReport,
}: {
  graph: GraphResponse | null;
  latestReport: LatestReportResponse | null;
}) {
  const providers = [
    ["Pages", `${graph?.summary.pageCount ?? 0} nodes`, "graph"],
    ["Components", `${graph?.summary.componentCount ?? 0} nodes`, "graph"],
    ["APIs", `${graph?.summary.apiCount ?? 0} nodes`, "graph"],
    ["Issues", `${countIssues(latestReport)} found`, "report"],
  ];

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <SectionTitle
          icon="▤"
          title="Scan providers"
          subtitle="Sources feeding graph data"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {providers.map(([name, meta, state]) => (
          <article
            key={name}
            className="rounded-[1.1rem] bg-white p-5 shadow-[0_1px_0_#dbe7f5,0_12px_28px_rgba(36,63,103,0.045)] transition hover:-translate-y-0.5"
          >
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#e8f1ff] text-xl text-[#2563eb]">
              ◈
            </div>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#111827]">
              {name}
            </h3>
            <p className="mt-1 text-sm text-[#667085]">{meta}</p>
            <p className="mt-4 inline-flex rounded-full bg-[#e6f7ee] px-3 py-1 text-xs font-bold text-[#0d9b51]">
              {state}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GraphPanel({ graph }: { graph: GraphResponse | null }) {
  const pages =
    graph?.nodes.filter((node) => node.type === "page").slice(0, 6) ?? [];
  const components =
    graph?.nodes.filter((node) => node.type === "component").slice(0, 6) ?? [];
  const apis =
    graph?.nodes.filter((node) => node.type === "api").slice(0, 6) ?? [];

  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-7">
      <SectionTitle
        icon="◇"
        title="Route graph"
        subtitle={`${graph?.nodes.length ?? 0} nodes · ${
          graph?.edges.length ?? 0
        } edges`}
      />

      <div className="mt-6 min-h-[18rem] rounded-[1.1rem] border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-4 sm:mt-7 sm:min-h-[22rem] sm:p-5">
        <div className="grid h-full gap-4 md:grid-cols-[1fr_1.1fr_0.9fr]">
          <GraphColumn
            title="Pages"
            rows={pages.map((node) => node.filePath)}
          />
          <GraphColumn
            title="Components"
            rows={components.map((node) => node.label)}
          />
          <GraphColumn title="APIs" rows={apis.map((node) => node.filePath)} />
        </div>
      </div>
    </section>
  );
}

function GraphColumn({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-[#2563eb]">{title}</p>
      <div className="space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row}
              className="truncate rounded-xl bg-[#f3f7fc] px-3 py-2 font-mono text-xs text-[#283548]"
            >
              {row}
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-[#f3f7fc] px-3 py-2 text-sm text-[#667085]">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

function ScanList({
  latestReport,
}: {
  latestReport: LatestReportResponse | null;
}) {
  const report = latestReport?.state === "valid" ? latestReport.report : null;
  const issues = report?.issues.slice(0, 6) ?? [];
  const invalidMessage =
    latestReport && latestReport.state !== "valid"
      ? latestReport.error?.message
      : null;

  return (
    <aside className="rounded-[1.35rem] bg-white p-4 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-6">
      <SectionTitle
        icon="▣"
        title="Latest report"
        subtitle={report ? report.scanId : "No scan report yet"}
      />

      <div className="mt-6 space-y-4">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="border-b border-[#e5edf7] pb-4 last:border-0 last:pb-0"
            >
              <div className="grid gap-1 min-[420px]:flex min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
                <p className="min-w-0 truncate font-mono text-sm text-[#111827]">
                  {issue.filePath ?? issue.type}
                </p>
                <span className="text-xs font-semibold text-[#758195]">
                  {issue.severity}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#c98216]">
                {issue.message}
              </p>
            </div>
          ))
        ) : invalidMessage ? (
          <p className="text-sm font-semibold text-red-700">{invalidMessage}</p>
        ) : (
          <p className="text-sm text-[#667085]">No issues to show.</p>
        )}
      </div>
    </aside>
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

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-3 text-xl font-semibold tracking-[-0.04em] text-[#111827] sm:text-2xl">
        <span className="text-[#2563eb]">{icon}</span>
        {title}
      </h2>
      <p className="mt-1 text-sm text-[#667085]">{subtitle}</p>
    </div>
  );
}

export function DashboardShell() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { data, isLoading, isScanning, error, runScan } = useDashboardData();

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fbfdff] text-[#111827]">
      <Sidebar />
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <main className="min-h-dvh bg-[linear-gradient(#e5edf7_1px,transparent_1px),linear-gradient(90deg,#e5edf7_1px,transparent_1px)] bg-[size:50px_50px] px-4 pb-8 md:ml-[18.5rem] md:px-6 md:py-7 lg:px-10 xl:ml-[18rem]">
        <MobileHeader onOpenMenu={() => setIsMobileSidebarOpen(true)} />
        <div className="mx-auto max-w-[88rem]">
          <Topbar
            project={data.project}
            isScanning={isScanning}
            onRunScan={runScan}
          />
          <div className="grid gap-5 sm:gap-6">
            <DashboardNotice isLoading={isLoading} error={error} />
            <EndpointPanel
              status={data.status}
              project={data.project}
              latestReport={data.latestReport}
            />
            <ProviderGrid graph={data.graph} latestReport={data.latestReport} />
            <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <GraphPanel graph={data.graph} />
              <ScanList latestReport={data.latestReport} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
