import type { ProductionGraphResponse, ProductionGraphSummary } from "@lutest/contracts";
import { validateProductionGraphResponse } from "@lutest/contracts";
import { buildProductionHttpGraph } from "./build-http-edges";
import { buildProductionEdges } from "./production-edge-builder";
import { buildProductionGraphNodes } from "./production-node-builder";
import { scanProductionProjectSymbols } from "./production-project-scanner";

const buildSummary = (graph: Pick<ProductionGraphResponse, "nodes" | "edges">): ProductionGraphSummary => ({
  fileCount: graph.nodes.filter((node) => node.kind === "file").length,
  pageCount: graph.nodes.filter((node) => node.kind === "page").length,
  componentCount: graph.nodes.filter((node) => node.kind === "component").length,
  hookCount: graph.nodes.filter((node) => node.kind === "hook").length,
  apiRouteCount: graph.nodes.filter((node) => node.kind === "api-route").length,
  apiClientMethodCount: graph.nodes.filter((node) => node.kind === "api-client-method").length,
  externalEndpointCount: graph.nodes.filter((node) => node.kind === "external-endpoint").length,
  edgeCount: graph.edges.length,
});

export const buildProductionGraph = async (input: {
  rootDir: string;
}): Promise<ProductionGraphResponse> => {
  const scan = await scanProductionProjectSymbols({ rootDir: input.rootDir });
  const baseNodes = buildProductionGraphNodes(scan.files);
  const httpGraph = buildProductionHttpGraph({ scan });
  const nodes = [...baseNodes, ...httpGraph.nodes];
  const graph: ProductionGraphResponse = {
    mode: "symbol-level",
    nodes,
    edges: [
      ...(await buildProductionEdges({ scan, nodes: baseNodes })),
      ...httpGraph.edges,
    ],
    summary: {
      fileCount: 0,
      pageCount: 0,
      componentCount: 0,
      hookCount: 0,
      apiRouteCount: 0,
      apiClientMethodCount: 0,
      externalEndpointCount: 0,
      edgeCount: 0,
    },
  };
  graph.summary = buildSummary(graph);

  const validation = validateProductionGraphResponse(graph);
  if (!validation.ok) {
    throw new Error(`Production graph validation failed: ${validation.message}`);
  }
  return validation.value;
};
