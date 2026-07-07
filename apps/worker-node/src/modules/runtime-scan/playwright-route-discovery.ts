import { buildProductionGraph } from "../graph/production/production-graph-builder";

const normalizeRoute = (route: string): string => {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith("//")) {
    throw new Error("Runtime scan route must be a local path");
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const discoverRuntimeScanRoutes = async (input: {
  projectRoot: string;
  routes?: string[];
}): Promise<{
  routes: string[];
  source: "request" | "production-graph" | "fallback";
  reason: string;
}> => {
  if (input.routes && input.routes.length > 0) {
    return {
      routes: [...new Set(input.routes.map(normalizeRoute))].sort(),
      source: "request",
      reason: "Routes provided by runtime scan request",
    };
  }

  const graph = await buildProductionGraph({ rootDir: input.projectRoot });
  const routes = graph.nodes
    .filter((node) => node.kind === "page" && node.route?.path)
    .map((node) => normalizeRoute(node.route?.path ?? "/"));
  const uniqueRoutes = [...new Set(routes)].sort();
  if (uniqueRoutes.length > 0) {
    return {
      routes: uniqueRoutes,
      source: "production-graph",
      reason: "Routes discovered from production graph page nodes",
    };
  }

  return {
    routes: ["/"],
    source: "fallback",
    reason: "No production graph page routes found; fallback to root route",
  };
};
