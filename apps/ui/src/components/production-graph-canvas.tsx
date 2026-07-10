"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from "@xyflow/react";
import type { ProductionGraphEdgeKind } from "@lutest/contracts";
import {
  adaptProductionGraphToFlowModel,
  filterProductionFlowEdges,
  type ProductionFlowEdge,
  type ProductionFlowModel,
  type ProductionFlowNode,
} from "@/lib/production-graph-adapter";
import { layoutProductionGraph } from "@/lib/production-graph-layout";
import { ProductionGraphDetailPanel } from "./production-graph-detail-panel";
import { ProductionGraphNode } from "./production-graph-node";

const nodeTypes = { productionGraphNode: ProductionGraphNode };
const defaultVisibleEdges: Record<ProductionGraphEdgeKind, boolean> = {
  import: true,
  render: true,
  call: true,
  http: true,
  route: true,
};
const edgeKinds: ProductionGraphEdgeKind[] = [
  "import",
  "render",
  "call",
  "http",
];

export function ProductionGraphCanvas({
  graph,
}: {
  graph: ProductionFlowModel | null;
}) {
  const [visibleEdges, setVisibleEdges] = useState(defaultVisibleEdges);
  const [layoutNodes, setLayoutNodes] = useState<ProductionFlowNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<ProductionFlowEdge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProductionFlowNode | null>(
    null,
  );
  const [selectedEdge, setSelectedEdge] = useState<ProductionFlowEdge | null>(
    null,
  );

  useEffect(() => {
    if (!graph || graph.nodes.length === 0) {
      setLayoutNodes([]);
      setLayoutEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
      return;
    }

    let cancelled = false;
    setIsLayouting(true);
    setLayoutError(null);
    layoutProductionGraph({ nodes: graph.nodes, edges: graph.edges })
      .then((layout) => {
        if (cancelled) return;
        setLayoutNodes(layout.nodes);
        setLayoutEdges(layout.edges);
      })
      .catch((cause) => {
        if (cancelled) return;
        setLayoutError(
          cause instanceof Error ? cause.message : "Failed to layout graph",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLayouting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [graph]);

  const visibleLayoutEdges = useMemo(
    () => filterProductionFlowEdges(layoutEdges, visibleEdges),
    [layoutEdges, visibleEdges],
  );
  const visibleEdgeKinds = edgeKinds.filter((kind) => visibleEdges[kind]);

  const onNodeClick: NodeMouseHandler<ProductionFlowNode> = (_event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const onEdgeClick: EdgeMouseHandler<ProductionFlowEdge> = (_event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  if (!graph) {
    return (
      <CanvasState
        title="No production graph"
        body="Switch to production mode to load symbol-level graph data."
      />
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <CanvasState
        title="Graph empty"
        body="Production graph returned no nodes for this project."
      />
    );
  }

  return (
    <section className="rounded-[1.35rem] bg-white p-3 shadow-[0_1px_0_#dbe7f5,0_18px_50px_rgba(36,63,103,0.06)] sm:p-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">
            Production canvas
          </p>
          <p className="mt-1 text-sm text-[#667085]">
            {graph.summary.nodeCount} nodes · {graph.summary.edgeCount} edges
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {edgeKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() =>
                setVisibleEdges((current) => ({
                  ...current,
                  [kind]: !current[kind],
                }))
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                visibleEdges[kind]
                  ? "border-[#2563eb] bg-[#e8f1ff] text-[#2563eb]"
                  : "border-[#dbe7f5] bg-white text-[#667085]"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>

      {layoutError ? (
        <CanvasState title="Layout failed" body={layoutError} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-h-[43.75rem] overflow-hidden rounded-2xl border border-[#dbe7f5] bg-[#fbfdff]">
            {isLayouting ? (
              <CanvasState
                title="Laying out graph"
                body="ELK is arranging symbol layers."
              />
            ) : (
              <ReactFlow
                proOptions={{ hideAttribution: true }}
                nodes={layoutNodes}
                edges={visibleLayoutEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.15}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
              >
                <Background gap={18} color="" />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor="#dbeafe"
                  maskColor="rgba(248,250,252,0.72)"
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            )}
          </div>
          <ProductionGraphDetailPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodes={layoutNodes}
            edges={layoutEdges}
            visibleEdgeKinds={visibleEdgeKinds}
          />
        </div>
      )}
    </section>
  );
}

function CanvasState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[18rem] place-items-center rounded-2xl border border-dashed border-[#dbe7f5] bg-[#fbfdff] p-6 text-center">
      <div>
        <p className="text-base font-semibold text-[#111827]">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#667085]">{body}</p>
      </div>
    </div>
  );
}

export { adaptProductionGraphToFlowModel };
