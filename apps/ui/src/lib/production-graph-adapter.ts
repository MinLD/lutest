import type {
  GraphConfidence,
  ProductionGraphEdgeKind,
  ProductionGraphHttpInfo,
  ProductionGraphLoc,
  ProductionGraphNodeKind,
  ProductionGraphResponse,
  ProductionGraphRouteInfo,
} from "@lutest/contracts";
import type { Edge, Node } from "@xyflow/react";

export type UiGraphNode = {
  id: string;
  label: string;
  type: ProductionGraphNodeKind;
  kind: ProductionGraphNodeKind;
  filePath?: string;
  loc?: ProductionGraphLoc;
  route?: ProductionGraphRouteInfo;
  http?: ProductionGraphHttpInfo;
  confidence: GraphConfidence;
  reason: string;
};

export type UiGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: ProductionGraphEdgeKind;
  kind: ProductionGraphEdgeKind;
  confidence: GraphConfidence;
  reason: string;
};

export type UiGraphSummary = {
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  pageCount: number;
  componentCount: number;
  hookCount: number;
  apiRouteCount: number;
  apiClientMethodCount: number;
  externalEndpointCount: number;
};

export type UiGraphModel = {
  nodes: UiGraphNode[];
  edges: UiGraphEdge[];
  summary: UiGraphSummary;
};

export type ProductionFlowNodeData = UiGraphNode & Record<string, unknown>;
export type ProductionFlowEdgeData = UiGraphEdge & Record<string, unknown>;
export type ProductionFlowNode = Node<ProductionFlowNodeData, "productionGraphNode">;
export type ProductionFlowEdge = Edge<ProductionFlowEdgeData>;

export type ProductionFlowModel = {
  nodes: ProductionFlowNode[];
  edges: ProductionFlowEdge[];
  nodeMap: Map<string, ProductionFlowNode>;
  summary: UiGraphSummary;
  nodesByKind: Record<ProductionGraphNodeKind, ProductionFlowNode[]>;
  edgesByKind: Record<ProductionGraphEdgeKind, ProductionFlowEdge[]>;
};

export type VisibleEdgeKinds = Partial<Record<ProductionGraphEdgeKind, boolean>>;

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

const emptyNodesByKind = (): Record<ProductionGraphNodeKind, ProductionFlowNode[]> => ({
  file: [],
  page: [],
  component: [],
  hook: [],
  "api-route": [],
  "api-client-method": [],
  utility: [],
  "external-endpoint": [],
});

const emptyEdgesByKind = (): Record<ProductionGraphEdgeKind, ProductionFlowEdge[]> => ({
  import: [],
  render: [],
  call: [],
  http: [],
  route: [],
});

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
      kind: node.kind,
      filePath: node.filePath,
      loc: node.loc,
      route: node.route,
      http: node.http,
      confidence: node.confidence,
      reason: node.reason,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.kind,
      type: edge.kind,
      kind: edge.kind,
      confidence: edge.confidence,
      reason: edge.reason,
    })),
    summary: {
      fileCount: graph.summary.fileCount,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      pageCount: graph.summary.pageCount,
      componentCount: graph.summary.componentCount,
      hookCount: graph.summary.hookCount,
      apiRouteCount: graph.summary.apiRouteCount,
      apiClientMethodCount: graph.summary.apiClientMethodCount,
      externalEndpointCount: graph.summary.externalEndpointCount,
    },
  };
}

export function adaptProductionGraphToFlowModel(
  graph: ProductionGraphResponse,
): ProductionFlowModel {
  const uiGraph = adaptProductionGraphToUiGraph(graph);
  const nodesByKind = emptyNodesByKind();
  const edgesByKind = emptyEdgesByKind();
  const nodeMap = new Map<string, ProductionFlowNode>();

  const nodes = uiGraph.nodes.map((node, index) => {
    const flowNode: ProductionFlowNode = {
      id: node.id,
      type: "productionGraphNode",
      position: { x: 0, y: index * 96 },
      data: node,
    };
    nodesByKind[node.kind].push(flowNode);
    nodeMap.set(flowNode.id, flowNode);
    return flowNode;
  });

  const edges = uiGraph.edges.map((edge) => {
    const sourceLabel = nodeMap.get(edge.source)?.data.label ?? edge.source;
    const targetLabel = nodeMap.get(edge.target)?.data.label ?? edge.target;
    const flowEdge: ProductionFlowEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      data: { ...edge, label: `${sourceLabel} -> ${targetLabel}` },
      animated: edge.kind === "http",
    };
    edgesByKind[edge.kind].push(flowEdge);
    return flowEdge;
  });

  return {
    nodes,
    edges,
    nodeMap,
    summary: uiGraph.summary,
    nodesByKind,
    edgesByKind,
  };
}

export function filterProductionFlowEdges(
  edges: ProductionFlowEdge[],
  visibleKinds: VisibleEdgeKinds,
): ProductionFlowEdge[] {
  return edges.filter((edge) => visibleKinds[edge.data?.kind ?? "route"] !== false);
}
