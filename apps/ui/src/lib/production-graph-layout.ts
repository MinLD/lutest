import ELK from "elkjs/lib/elk.bundled.js";
import type { ProductionFlowEdge, ProductionFlowNode } from "./production-graph-adapter";

const elk = new ELK();
const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;
const KIND_ORDER: Record<string, number> = {
  page: 0,
  component: 1,
  hook: 2,
  "api-client-method": 3,
  "external-endpoint": 4,
  "api-route": 5,
  utility: 6,
  file: 7,
};

export async function layoutProductionGraph(input: {
  nodes: ProductionFlowNode[];
  edges: ProductionFlowEdge[];
}): Promise<{ nodes: ProductionFlowNode[]; edges: ProductionFlowEdge[] }> {
  const orderedNodes = [...input.nodes].sort((left, right) => {
    const leftRank = KIND_ORDER[left.data.kind] ?? 99;
    const rightRank = KIND_ORDER[right.data.kind] ?? 99;
    return leftRank - rightRank || left.data.label.localeCompare(right.data.label);
  });

  const graph = await elk.layout({
    id: "production-graph",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.spacing.nodeNode": "36",
      "elk.edgeLabels.inline": "true",
    },
    children: orderedNodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const positions = new Map(
    graph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? [],
  );

  return {
    nodes: orderedNodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: input.edges.map((edge) => ({ ...edge })),
  };
}
