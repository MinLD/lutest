import { strict as assert } from "node:assert";
import type { ProductionGraphResponse } from "@lutest/contracts";
import { validateProductionGraphResponse } from "@lutest/contracts";
import {
  adaptProductionGraphToUiGraph,
  labelProductionGraphNode,
} from "./production-graph-adapter";

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
      id: "external:https://api.example.com/users",
      kind: "external-endpoint",
      name: "https://api.example.com/users",
      http: { method: "GET", path: "https://api.example.com/users" },
      confidence: "high",
      reason: "self-check",
    },
  ],
  edges: [
    {
      id: "http:symbol:src/app/page.tsx:Home->external:https://api.example.com/users",
      kind: "http",
      source: "symbol:src/app/page.tsx:Home",
      target: "external:https://api.example.com/users",
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
    apiClientMethodCount: 0,
    externalEndpointCount: 1,
    edgeCount: 1,
  },
};

const validation = validateProductionGraphResponse(graph);
assert.equal(validation.ok, true);

const uiGraph = adaptProductionGraphToUiGraph(graph);
assert.equal(uiGraph.nodes.length, 3);
assert.equal(uiGraph.edges.length, 1);
assert.equal(uiGraph.summary.nodeCount, 3);
assert.equal(uiGraph.summary.edgeCount, 1);
assert.equal(uiGraph.summary.externalEndpointCount, 1);
assert.equal(labelProductionGraphNode("external-endpoint"), "Endpoint");
assert.equal(uiGraph.nodes.find((node) => node.type === "page")?.route?.path, "/");
assert.equal(graph.nodes[1]?.name, "Home");
assert.equal(validateProductionGraphResponse({}).ok, false);

console.log("production graph adapter self-check passed");
