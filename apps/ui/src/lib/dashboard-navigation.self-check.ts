import { strict as assert } from "node:assert";
import { dashboardNavItems, DEFAULT_DASHBOARD_PAGE } from "./dashboard-navigation";

const labels = dashboardNavItems.map((item) => item.label);
assert.deepEqual(labels, ["Endpoint", "Graph", "Reports", "Scans", "Settings"]);
assert.equal(DEFAULT_DASHBOARD_PAGE, "graph");

console.log("dashboard navigation self-check passed");
