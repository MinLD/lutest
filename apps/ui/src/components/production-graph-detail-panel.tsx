import type { ProductionGraphEdgeKind } from "@lutest/contracts";
import type { ProductionFlowEdge, ProductionFlowNode } from "@/lib/production-graph-adapter";

export function ProductionGraphDetailPanel({
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  visibleEdgeKinds,
}: {
  selectedNode: ProductionFlowNode | null;
  selectedEdge: ProductionFlowEdge | null;
  nodes: ProductionFlowNode[];
  edges: ProductionFlowEdge[];
  visibleEdgeKinds: ProductionGraphEdgeKind[];
}) {
  if (selectedNode) {
    const incoming = edges.filter((edge) => edge.target === selectedNode.id).length;
    const outgoing = edges.filter((edge) => edge.source === selectedNode.id).length;
    const data = selectedNode.data;
    return (
      <DetailShell title={data.label} eyebrow="Node detail">
        <DetailRow label="kind" value={data.kind} />
        <DetailRow label="file" value={data.filePath} />
        <DetailRow label="loc" value={data.loc ? `${data.loc.startLine}-${data.loc.endLine}` : undefined} />
        <DetailRow label="route" value={data.route ? `${data.route.kind} ${data.route.path}` : undefined} />
        <DetailRow label="http" value={data.http ? `${data.http.method ?? "UNKNOWN"} ${data.http.path ?? ""}` : undefined} />
        <DetailRow label="confidence" value={data.confidence} />
        <DetailRow label="incoming" value={String(incoming)} />
        <DetailRow label="outgoing" value={String(outgoing)} />
        <p className="mt-3 line-clamp-3 rounded-xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#475569]">{data.reason}</p>
      </DetailShell>
    );
  }

  if (selectedEdge) {
    const source = nodes.find((node) => node.id === selectedEdge.source)?.data.label ?? selectedEdge.source;
    const target = nodes.find((node) => node.id === selectedEdge.target)?.data.label ?? selectedEdge.target;
    const data = selectedEdge.data;
    return (
      <DetailShell title={data?.kind ?? selectedEdge.label?.toString() ?? "edge"} eyebrow="Edge detail">
        <DetailRow label="source" value={source} />
        <DetailRow label="target" value={target} />
        <DetailRow label="kind" value={data?.kind} />
        <DetailRow label="confidence" value={data?.confidence} />
        <p className="mt-3 line-clamp-3 rounded-xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#475569]">{data?.reason ?? "No reason"}</p>
      </DetailShell>
    );
  }

  return (
    <DetailShell title="Graph overview" eyebrow="Inspector">
      <DetailRow label="nodes" value={String(nodes.length)} />
      <DetailRow label="edges" value={String(edges.length)} />
      <DetailRow label="visible" value={visibleEdgeKinds.join(", ")} />
      <p className="rounded-xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#667085]">
        Click a node or edge for metadata.
      </p>
    </DetailShell>
  );
}

function DetailShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border border-[#dbe7f5] bg-white p-4 shadow-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">{eyebrow}</p>
      <h3 className="truncate text-base font-semibold tracking-[-0.03em] text-[#111827]">{title}</h3>
      <div className="mt-4 space-y-2">{children}</div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-xs">
      <span className="font-bold uppercase tracking-[0.14em] text-[#94a3b8]">{label}</span>
      <span className="min-w-0 truncate font-mono text-[#334155]">{value}</span>
    </div>
  );
}
