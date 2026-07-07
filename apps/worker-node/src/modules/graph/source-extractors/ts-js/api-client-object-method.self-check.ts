import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateProductionGraphResponse } from "@lutest/contracts";
import { buildProductionGraph } from "../../production/production-graph-builder";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const main = async (): Promise<void> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-api-client-object-"));
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { react: "latest" } }),
  );
  await writeFile(
    path.join(root, "src", "lib", "api.tsx"),
    `
      function requestJson(path: string, init?: { method?: string }) { return { path, init }; }
      const dynamicPath = "/api/dynamic";
      export const metadata = {
        title: "Fixture title",
        description: "Fixture description",
      };
      export const config = {
        theme: { color: "blue" },
        count: 2,
      };
      export const api = {
        getUsers() { return requestJson("/api/users"); },
        createUser: () => requestJson("/api/users", { method: "POST" }),
        duplicated() { requestJson("/api/users"); return requestJson("/api/users"); },
        noStaticEndpoint() { return requestJson(dynamicPath); },
        Widget() { return <div />; }
      };
      export function getProducts() { return fetch("/api/products"); }
    `,
  );

  const graph = await buildProductionGraph({ rootDir: root });
  const validation = validateProductionGraphResponse(graph);
  assert.equal(validation.ok, true, validation.ok ? "valid" : validation.message);

  const apiMethods = graph.nodes.filter((node) => node.kind === "api-client-method");
  const endpoints = graph.nodes.filter((node) => node.kind === "external-endpoint");
  const httpEdges = graph.edges.filter((edge) => edge.kind === "http");
  const components = graph.nodes.filter((node) => node.kind === "component");

  assert(apiMethods.some((node) => node.name === "api.getUsers"), "object shorthand method detected");
  assert(apiMethods.some((node) => node.name === "api.createUser"), "object arrow method detected");
  assert(apiMethods.some((node) => node.name === "getProducts"), "direct fetch still detected");
  assert(!apiMethods.some((node) => node.name === "api.noStaticEndpoint"), "unknown helper without static endpoint skipped");
  assert(!components.some((node) => node.name === "api.Widget"), "JSX object method not component");
  assert(!graph.nodes.some((node) => node.name === "metadata.title"), "metadata title not emitted");
  assert(!graph.nodes.some((node) => node.name === "metadata.description"), "metadata description not emitted");
  assert(!graph.nodes.some((node) => node.name === "config.theme"), "plain nested config not emitted");

  assert(endpoints.some((node) => node.name === "GET /api/users"), "GET endpoint detected");
  assert(endpoints.some((node) => node.name === "POST /api/users"), "POST endpoint detected");
  assert(endpoints.some((node) => node.name === "GET /api/products"), "fetch endpoint detected");
  assert.equal(endpoints.filter((node) => node.name === "GET /api/users").length, 1, "duplicate endpoint deduped");
  assert(httpEdges.length >= 4, "HTTP edges created");
  assert.equal(graph.summary.externalEndpointCount, endpoints.length, "endpoint summary correct");
  assert.equal(graph.summary.edgeCount, graph.edges.length, "edge summary correct");

  console.log("api client object method self-check passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
