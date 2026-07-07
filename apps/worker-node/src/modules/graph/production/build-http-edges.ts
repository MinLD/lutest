import type { ProductionGraphEdge, ProductionGraphNode } from "@lutest/contracts";
import type { ClassifiedSourceSymbol, DirectNetworkTarget } from "../source-extractors/source-extractor.types";
import type { ProductionProjectScanResult } from "./production-project-scanner";

const normalizedMethod = (target: DirectNetworkTarget): string | undefined => {
  if (target.method) return target.method.toUpperCase();
  if (target.client === "fetch" || target.client === "ofetch") return "GET";
  return undefined;
};

const normalizeTarget = (target: string): string => target.trim();

const endpointNodeId = (target: DirectNetworkTarget): string => {
  const method = normalizedMethod(target) ?? "UNKNOWN";
  return `external-endpoint:${method}:${normalizeTarget(target.target)}`;
};

const endpointNode = (target: DirectNetworkTarget): ProductionGraphNode => {
  const method = normalizedMethod(target);
  const path = normalizeTarget(target.target);
  return {
    id: endpointNodeId(target),
    kind: "external-endpoint",
    name: method ? `${method} ${path}` : path,
    http: { method, path },
    confidence: "high",
    reason: "Direct network target detected from source symbol",
  };
};

const httpEdgeId = (source: string, target: string): string =>
  `http:${source}->${target}`;

const shouldCreateEndpoint = (target: DirectNetworkTarget): boolean =>
  normalizeTarget(target.target).length > 0;

const networkSymbols = (scan: ProductionProjectScanResult): ClassifiedSourceSymbol[] =>
  scan.files.flatMap((file) => file.symbols).filter((symbol) => symbol.directNetworkTargets.length > 0);

export const buildProductionHttpGraph = (input: {
  scan: ProductionProjectScanResult;
}): { nodes: ProductionGraphNode[]; edges: ProductionGraphEdge[] } => {
  const nodes = new Map<string, ProductionGraphNode>();
  const edges = new Map<string, ProductionGraphEdge>();

  for (const symbol of networkSymbols(input.scan)) {
    for (const target of symbol.directNetworkTargets) {
      if (!shouldCreateEndpoint(target)) continue;
      const endpoint = endpointNode(target);
      nodes.set(endpoint.id, endpoint);
      edges.set(httpEdgeId(symbol.id, endpoint.id), {
        id: httpEdgeId(symbol.id, endpoint.id),
        kind: "http",
        source: symbol.id,
        target: endpoint.id,
        confidence: "high",
        reason: "Source symbol contains direct network call to endpoint",
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()).sort((left, right) => left.id.localeCompare(right.id)),
    edges: Array.from(edges.values()).sort((left, right) => left.id.localeCompare(right.id)),
  };
};
