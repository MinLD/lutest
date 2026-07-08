import type {
  RuntimeFlowTarget,
  RuntimeRouteTarget,
  RuntimeScanLimits,
  RuntimeScanTarget,
  RuntimeStateTarget,
} from "./runtime-scan.schema";

export type RuntimeDiscoveryMode = "all-routes" | "selected-routes" | "custom-targets";

export type RuntimeTargetDiscovery = {
  mode: RuntimeDiscoveryMode;
  routes: string[];
  targets: RuntimeScanTarget[];
  source: "request" | "production-graph" | "fallback";
  reason: string;
};

export type RuntimeTargetInput = {
  routes: string[];
  source: "request" | "production-graph" | "fallback";
  reason: string;
  limits: RuntimeScanLimits;
};

export const createRuntimeRouteTarget = (route: string, index: number): RuntimeRouteTarget => ({
  id: `route:${index + 1}`,
  kind: "route",
  route,
});

export const createRuntimeStateTargetPlaceholder = (name: string, index: number): RuntimeStateTarget => ({
  id: `state:${index + 1}`,
  kind: "state",
  name,
});

export const createRuntimeFlowTargetPlaceholder = (name: string, index: number): RuntimeFlowTarget => ({
  id: `flow:${index + 1}`,
  kind: "flow",
  name,
  steps: [],
});

export const resolveRuntimeTargetDiscovery = (input: RuntimeTargetInput): RuntimeTargetDiscovery => {
  const cappedRoutes = input.routes.slice(0, input.limits.maxRoutes);
  const mode: RuntimeDiscoveryMode = input.source === "request" ? "selected-routes" : "all-routes";
  const targets = cappedRoutes.slice(0, input.limits.maxTargets).map(createRuntimeRouteTarget);
  const capReason = input.routes.length > cappedRoutes.length
    ? `${input.reason}; capped by maxRoutes=${input.limits.maxRoutes}`
    : input.reason;
  const targetReason = cappedRoutes.length > targets.length
    ? `${capReason}; capped by maxTargets=${input.limits.maxTargets}`
    : capReason;

  return {
    mode,
    routes: cappedRoutes,
    targets,
    source: input.source,
    reason: targetReason,
  };
};

export const assertExecutableRuntimeRouteTarget = (target: RuntimeScanTarget): RuntimeRouteTarget => {
  if (target.kind !== "route") {
    throw new Error("Runtime scan only executes route targets in R6.3");
  }
  return target;
};
