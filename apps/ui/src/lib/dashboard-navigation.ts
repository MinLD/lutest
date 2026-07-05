export type DashboardPage = "endpoint" | "graph" | "reports" | "scans" | "settings";

export type DashboardNavItem = {
  id: DashboardPage;
  label: string;
  purpose: string;
};

export const DEFAULT_DASHBOARD_PAGE: DashboardPage = "graph";

export const dashboardNavItems: DashboardNavItem[] = [
  { id: "endpoint", label: "Endpoint", purpose: "API endpoint configuration" },
  { id: "graph", label: "Graph", purpose: "Production symbol graph" },
  { id: "reports", label: "Reports", purpose: "Scan issues and latest report" },
  { id: "scans", label: "Scans", purpose: "Run checks and future browser scans" },
  { id: "settings", label: "Settings", purpose: "Manage preferences" },
];
