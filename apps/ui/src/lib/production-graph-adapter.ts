import type {
  GraphConfidence,
  ProductionGraphEdgeKind,
  ProductionGraphNodeKind,
  ProductionGraphResponse,
  ProductionGraphRouteInfo,
} from "@lutest/contracts";

export type UiGraphNode = {
  id: string;
  label: string;
  type: ProductionGraphNodeKind;
  filePath?: string;
  route?: ProductionGraphRouteInfo;
  confidence: GraphConfidence;
  reason: string;
};

export type UiGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: ProductionGraphEdgeKind;
  confidence: GraphConfidence;
  reason: string;
};

export type UiGraphSummary = {
  nodeCount: number;
  edgeCount: number;
  pageCount: number;
  componentCount: number;
  apiRouteCount: number;
  apiClientMethodCount: number;
  externalEndpointCount: number;
};

export type UiGraphModel = {
  nodes: UiGraphNode[];
  edges: UiGraphEdge[];
  summary: UiGraphSummary;
};

const nodeTypeLabels: Record<ProductionGraphNodeKind, string> = {
  file: "File",
  page: "Page",
  component: "Component",
  hook: "Hook",
  "api-route": "API Route",
  "api-client-method": "API Client",
  utility: "Utility",
  "external-endpoint": "Endpoint",
};

export function labelProductionGraphNode(kind: ProductionGraphNodeKind) {
  return nodeTypeLabels[kind];
}

export function adaptProductionGraphToUiGraph(
  graph: ProductionGraphResponse,
): UiGraphModel {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.name || node.id,
      type: node.kind,
      filePath: node.filePath,
      route: node.route,
      confidence: node.confidence,
      reason: node.reason,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.kind,
      type: edge.kind,
      confidence: edge.confidence,
      reason: edge.reason,
    })),
    summary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      pageCount: graph.summary.pageCount,
      componentCount: graph.summary.componentCount,
      apiRouteCount: graph.summary.apiRouteCount,
      apiClientMethodCount: graph.summary.apiClientMethodCount,
      externalEndpointCount: graph.summary.externalEndpointCount,
    },
  };
}
