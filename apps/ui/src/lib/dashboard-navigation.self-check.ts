import { strict as assert } from "node:assert";
import { dashboardNavItems, DEFAULT_DASHBOARD_PAGE } from "./dashboard-navigation";
import { DEFAULT_GRAPH_MODE } from "./use-dashboard-data";

const labels = dashboardNavItems.map((item) => item.label);
assert.deepEqual(labels, ["Endpoint", "Graph", "Reports", "Scans", "Settings"]);
assert.equal(DEFAULT_DASHBOARD_PAGE, "graph");
assert.equal(DEFAULT_GRAPH_MODE, process.env.NEXT_PUBLIC_LUTEST_SHOW_LEGACY_GRAPH === "true" && process.env.NEXT_PUBLIC_LUTEST_GRAPH_MODE === "legacy" ? "legacy" : "production");

console.log("dashboard navigation self-check passed");
