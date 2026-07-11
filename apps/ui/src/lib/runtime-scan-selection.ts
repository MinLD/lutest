import {
  validateRuntimeScanRequest,
  type ProductionGraphResponse,
  type RuntimeArtifactDetailResponse,
  type RuntimeScanRequest,
} from "@lutest/contracts";

export type RuntimeScanRouteOption = {
  route: string;
  source: "production-graph" | "latest-runtime";
};

export type RuntimeScanSelectionInput = {
  mode: "all-routes" | "selected-routes";
  baseUrl: string;
  availableRoutes: string[];
  selectedRoutes: string[];
  interactionDiscoveryEnabled?: boolean;
};

export type RuntimeScanSelectionResult =
  | { ok: true; request: RuntimeScanRequest }
  | { ok: false; message: string };

const isSelectableRoute = (route: string): boolean =>
  validateRuntimeScanRequest({
    enabled: true,
    baseUrl: "http://localhost:3000",
    discoveryMode: "selected-routes",
    routes: [route],
    viewportPreset: "default",
  }).ok;

export const runtimeScanRouteOptions = (
  graph: ProductionGraphResponse | null,
  detail: RuntimeArtifactDetailResponse | null,
): RuntimeScanRouteOption[] => {
  const options = new Map<string, RuntimeScanRouteOption>();
  for (const node of graph?.nodes ?? []) {
    const route = node.kind === "page" && node.route?.kind === "page" ? node.route.path : undefined;
    if (route && isSelectableRoute(route)) options.set(route, { route, source: "production-graph" });
  }
  for (const target of detail?.targetResults ?? []) {
    if (isSelectableRoute(target.route) && !options.has(target.route)) {
      options.set(target.route, { route: target.route, source: "latest-runtime" });
    }
  }
  return [...options.values()].sort((left, right) => left.route.localeCompare(right.route));
};

export const buildRuntimeScanSelectionRequest = (
  input: RuntimeScanSelectionInput,
): RuntimeScanSelectionResult => {
  const availableRoutes = [...new Set(input.availableRoutes)].filter(isSelectableRoute);
  if (availableRoutes.length === 0) return { ok: false, message: "No valid runtime routes are available." };

  const selectedRoutes = [...new Set(input.selectedRoutes)].filter((route) => availableRoutes.includes(route));
  if (input.mode === "selected-routes" && selectedRoutes.length === 0) {
    return { ok: false, message: "Select at least one valid route." };
  }
  if (input.mode === "selected-routes" && selectedRoutes.length !== new Set(input.selectedRoutes).size) {
    return { ok: false, message: "Selected routes contain an unknown or invalid target." };
  }

  const candidate: RuntimeScanRequest = {
    enabled: true,
    baseUrl: input.baseUrl.trim(),
    discoveryMode: input.mode,
    viewportPreset: "default",
    ...(input.interactionDiscoveryEnabled ? { interactionDiscovery: { enabled: true as const } } : {}),
    ...(input.mode === "selected-routes" ? { routes: selectedRoutes } : {}),
  };
  const validation = validateRuntimeScanRequest(candidate);
  return validation.ok
    ? { ok: true, request: validation.value }
    : { ok: false, message: validation.message };
};

export const submitRuntimeScanSelection = async (
  input: RuntimeScanSelectionInput,
  run: (request: RuntimeScanRequest) => Promise<void> | void,
): Promise<RuntimeScanSelectionResult> => {
  const result = buildRuntimeScanSelectionRequest(input);
  if (!result.ok) return result;
  await run(result.request);
  return result;
};
