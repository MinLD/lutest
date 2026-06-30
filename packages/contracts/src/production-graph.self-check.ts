import { validateProductionGraphResponse } from "./index";

const validGraph = {
  mode: "symbol-level",
  nodes: [
    {
      id: "file:src/app/page.tsx",
      kind: "file",
      name: "page.tsx",
      filePath: "src/app/page.tsx",
      confidence: "high",
      reason: "Fixture file node",
    },
    {
      id: "component:src/app/page.tsx#HomePage",
      kind: "page",
      name: "HomePage",
      filePath: "src/app/page.tsx",
      loc: { startLine: 1, endLine: 12 },
      route: { path: "/", kind: "page" },
      confidence: "high",
      reason: "Fixture page symbol",
    },
    {
      id: "endpoint:https://api.example.com/products",
      kind: "external-endpoint",
      name: "GET /products",
      http: { method: "GET", path: "https://api.example.com/products" },
      confidence: "medium",
      reason: "Fixture external endpoint",
    },
  ],
  edges: [
    {
      id: "route:/->component:src/app/page.tsx#HomePage",
      kind: "route",
      source: "file:src/app/page.tsx",
      target: "component:src/app/page.tsx#HomePage",
      confidence: "high",
      reason: "Fixture route edge",
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

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

assert(validateProductionGraphResponse(validGraph).ok, "valid graph passes");

assert(
  !validateProductionGraphResponse({
    ...validGraph,
    nodes: [{ ...validGraph.nodes[0], kind: "screen" }],
  }).ok,
  "invalid node kind fails",
);

assert(
  !validateProductionGraphResponse({
    ...validGraph,
    edges: [{ ...validGraph.edges[0], kind: "depends" }],
  }).ok,
  "invalid edge kind fails",
);

assert(
  !validateProductionGraphResponse({
    ...validGraph,
    nodes: [{ ...validGraph.nodes[0], confidence: undefined }],
  }).ok,
  "missing confidence fails",
);

assert(
  !validateProductionGraphResponse({
    ...validGraph,
    nodes: [{ ...validGraph.nodes[0], reason: "" }],
  }).ok,
  "missing reason fails",
);

assert(
  !validateProductionGraphResponse({
    ...validGraph,
    summary: { ...validGraph.summary, edgeCount: 2 },
  }).ok,
  "summary edgeCount mismatch fails",
);

console.log("production graph self-check passed");
