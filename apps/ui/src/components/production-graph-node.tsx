import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ProductionFlowNode } from "@/lib/production-graph-adapter";

const kindClass: Record<string, string> = {
  page: "border-blue-200 bg-blue-50 text-blue-700",
  component: "border-indigo-200 bg-indigo-50 text-indigo-700",
  hook: "border-violet-200 bg-violet-50 text-violet-700",
  "api-client-method": "border-amber-200 bg-amber-50 text-amber-700",
  "external-endpoint": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "api-route": "border-cyan-200 bg-cyan-50 text-cyan-700",
  utility: "border-slate-200 bg-slate-50 text-slate-700",
  file: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function ProductionGraphNode({ data, selected }: NodeProps<ProductionFlowNode>) {
  const detail = data.route?.path ?? data.http?.path ?? data.filePath ?? "no path";

  return (
    <div
      className={`min-w-[13.75rem] rounded-2xl border bg-white px-3 py-2 shadow-sm transition ${
        selected ? "border-[#2563eb] shadow-[0_16px_30px_rgba(37,99,235,0.18)]" : "border-[#dbe7f5]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-[#94a3b8]" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold tracking-[-0.02em] text-[#111827]">
          {data.label}
        </p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold ${kindClass[data.kind]}`}>
          {data.kind}
        </span>
      </div>
      <p className="truncate font-mono text-[0.7rem] text-[#475569]">{detail}</p>
      {data.filePath ? (
        <p className="mt-1 truncate font-mono text-[0.65rem] text-[#94a3b8]">{data.filePath}</p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-[#2563eb]" />
    </div>
  );
}
