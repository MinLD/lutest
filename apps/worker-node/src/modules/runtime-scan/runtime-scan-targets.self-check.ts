import assert from "node:assert/strict";
import { DEFAULT_RUNTIME_SCAN_LIMITS } from "./runtime-scan-limits";
import {
  assertExecutableRuntimeRouteTarget,
  createRuntimeFlowTargetPlaceholder,
  createRuntimeStateTargetPlaceholder,
  resolveRuntimeTargetDiscovery,
} from "./runtime-scan-targets";

const main = () => {
  const selected = resolveRuntimeTargetDiscovery({
    routes: ["/", "/docs"],
    source: "request",
    reason: "self-check",
    limits: DEFAULT_RUNTIME_SCAN_LIMITS,
  });
  assert.equal(selected.mode, "selected-routes");
  assert.deepEqual(selected.routes, ["/", "/docs"]);
  assert.deepEqual(selected.targets.map((target) => target.id), ["route:1", "route:2"]);
  assert.equal(selected.targets[0]?.kind, "route");

  const all = resolveRuntimeTargetDiscovery({
    routes: ["/a", "/b", "/c"],
    source: "production-graph",
    reason: "self-check",
    limits: { ...DEFAULT_RUNTIME_SCAN_LIMITS, maxRoutes: 2, maxTargets: 1 },
  });
  assert.equal(all.mode, "all-routes");
  assert.deepEqual(all.routes, ["/a", "/b"]);
  assert.equal(all.targets.length, 1);
  assert.match(all.reason, /maxRoutes=2/);
  assert.match(all.reason, /maxTargets=1/);

  const state = createRuntimeStateTargetPlaceholder("signed-in", 0);
  const flow = createRuntimeFlowTargetPlaceholder("checkout", 0);
  assert.deepEqual(state, { id: "state:1", kind: "state", name: "signed-in" });
  assert.deepEqual(flow, { id: "flow:1", kind: "flow", name: "checkout", steps: [] });
  assert.throws(() => assertExecutableRuntimeRouteTarget(state), /only executes route targets/);

  console.log("runtime scan targets self-check passed");
};

main();
