import { strict as assert } from "node:assert";
import type { ProductionGraphResponse } from "@lutest/contracts";
import { validateProductionGraphResponse } from "@lutest/contracts";
import {
  adaptProductionGraphToFlowModel,
  adaptProductionGraphToUiGraph,
  filterProductionFlowEdges,
  labelProductionGraphNode,
} from "./production-graph-adapter";
import { layoutProductionGraph } from "./production-graph-layout";

const graph: ProductionGraphResponse = {
  mode: "symbol-level",
  nodes: [
    {
      id: "file:src/app/page.tsx",
      kind: "file",
      name: "src/app/page.tsx",
      filePath: "src/app/page.tsx",
      confidence: "high",
      reason: "self-check",
    },
    {
      id: "symbol:src/app/page.tsx:Home",
      kind: "page",
      name: "Home",
      filePath: "src/app/page.tsx",
      route: { path: "/", kind: "page" },
      confidence: "high",
      reason: "self-check",
    },
    {
      id: "symbol:src/lib/api-client.ts:lutestApi.getGraph",
      kind: "api-client-method",
      name: "lutestApi.getGraph",
      filePath: "src/lib/api-client.ts",
      confidence: "high",
      reason: "self-check",
    },
    {
      id: "external:GET:/api/graph",
      kind: "external-endpoint",
      name: "GET /api/graph",
      http: { method: "GET", path: "/api/graph" },
      confidence: "high",
      reason: "self-check",
    },
  ],
  edges: [
    {
      id: "call:symbol:src/app/page.tsx:Home->symbol:src/lib/api-client.ts:lutestApi.getGraph",
      kind: "call",
      source: "symbol:src/app/page.tsx:Home",
      target: "symbol:src/lib/api-client.ts:lutestApi.getGraph",
      confidence: "high",
      reason: "self-check",
    },
    {
      id: "http:symbol:src/lib/api-client.ts:lutestApi.getGraph->external:GET:/api/graph",
      kind: "http",
      source: "symbol:src/lib/api-client.ts:lutestApi.getGraph",
      target: "external:GET:/api/graph",
      confidence: "high",
      reason: "self-check",
    },
    {
      id: "import:file:src/app/page.tsx->file:src/lib/api-client.ts",
      kind: "import",
      source: "file:src/app/page.tsx",
      target: "symbol:src/lib/api-client.ts:lutestApi.getGraph",
      confidence: "high",
      reason: "self-check",
    },
  ],
  summary: {
    fileCount: 1,
    pageCount: 1,
    componentCount: 0,
    hookCount: 0,
    apiRouteCount: 0,
    apiClientMethodCount: 1,
    externalEndpointCount: 1,
    edgeCount: 3,
  },
};

async function main() {
  const validation = validateProductionGraphResponse(graph);
  assert.equal(validation.ok, true);

  const uiGraph = adaptProductionGraphToUiGraph(graph);
  assert.equal(uiGraph.nodes.length, 4);
  assert.equal(uiGraph.edges.length, 3);
  assert.equal(uiGraph.summary.fileCount, 1);
  assert.equal(uiGraph.summary.nodeCount, 4);
  assert.equal(uiGraph.summary.edgeCount, 3);
  assert.equal(uiGraph.summary.apiClientMethodCount, 1);
  assert.equal(uiGraph.summary.externalEndpointCount, 1);
  assert.equal(uiGraph.summary.hookCount, 0);
  assert.equal(labelProductionGraphNode("external-endpoint"), "Endpoint");
  assert.equal(uiGraph.nodes.find((node) => node.type === "page")?.route?.path, "/");
  assert.equal(uiGraph.nodes.find((node) => node.kind === "api-client-method")?.label, "lutestApi.getGraph");

  const flowGraph = adaptProductionGraphToFlowModel(graph);
  assert.equal(flowGraph.nodes.length, 4);
  assert.equal(flowGraph.edges.length, 3);
  assert.equal(flowGraph.nodeMap.get("external:GET:/api/graph")?.data.label, "GET /api/graph");
  assert.equal(flowGraph.nodesByKind.page.length, 1);
  assert.equal(flowGraph.nodesByKind["api-client-method"].length, 1);
  assert.equal(flowGraph.edgesByKind.http.length, 1);
  assert.equal(flowGraph.edgesByKind.call.length, 1);
  assert.equal(flowGraph.edgesByKind.import.length, 1);
  assert.equal(flowGraph.summary.fileCount, 1);
  assert.equal(flowGraph.summary.edgeCount, 3);
  assert.equal(flowGraph.summary.apiClientMethodCount, 1);
  assert.equal(flowGraph.edgesByKind.http[0]?.data?.label, "lutestApi.getGraph -> GET /api/graph");
  assert.equal(filterProductionFlowEdges(flowGraph.edges, { import: false }).some((edge) => edge.data?.kind === "import"), false);

  const layout = await layoutProductionGraph({ nodes: flowGraph.nodes, edges: flowGraph.edges });
  assert.equal(layout.nodes.length, flowGraph.nodes.length);
  assert.equal(layout.edges.length, flowGraph.edges.length);
  assert(layout.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
  assert.equal(layout.edges[0]?.source, flowGraph.edges[0]?.source);
  assert.equal(layout.edges[0]?.target, flowGraph.edges[0]?.target);

  assert.equal(graph.nodes[1]?.name, "Home");
  assert.equal(validateProductionGraphResponse({}).ok, false);

  console.log("production graph adapter self-check passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
