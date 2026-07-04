import assert from "node:assert/strict";
import fs from "node:fs/promises";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { validateProductionGraphResponse, type ProductionGraphResponse } from "@lutest/contracts";
import { createApp } from "../../../app";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const requestJson = async (baseUrl: string, route: string) => {
  const response = await fetch(`${baseUrl}${route}`);
  return { status: response.status, body: await response.json() };
};

const listen = (app: ReturnType<typeof createApp>): Promise<{
  baseUrl: string;
  server: http.Server;
}> =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string", "server has TCP address");
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, server });
    });
  });

const buildProject = async (): Promise<{ allowedRoot: string; outsideRoot: string }> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-production-graph-http-"));
  const allowedRoot = path.join(root, "allowed");
  const outsideRoot = path.join(root, "outside");
  await fs.mkdir(outsideRoot, { recursive: true });
  await writeFile(path.join(allowedRoot, "package.json"), JSON.stringify({ dependencies: { next: "latest", react: "latest" } }));
  await writeFile(path.join(allowedRoot, "tsconfig.json"), JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["*"] } } }));
  await writeFile(path.join(allowedRoot, "app", "page.tsx"), `
    import ProductCard from "../components/ProductCard";
    import { useProducts } from "../hooks/useProducts";
    export default function HomePage() { useProducts(); return <main><ProductCard /></main>; }
  `);
  await writeFile(path.join(allowedRoot, "components", "ProductCard.tsx"), `
    import { getProducts } from "../lib/api";
    export function ProductCard() { getProducts(); return <article />; }
  `);
  await writeFile(path.join(allowedRoot, "hooks", "useProducts.ts"), "export function useProducts() { return []; }");
  await writeFile(path.join(allowedRoot, "lib", "api.ts"), "export async function getProducts() { return fetch('/api/products'); }");
  await writeFile(path.join(allowedRoot, "app", "api", "products", "route.ts"), "export async function GET() { return Response.json([]); }");
  return { allowedRoot, outsideRoot };
};

const countKind = (graph: ProductionGraphResponse, kind: string): number =>
  graph.nodes.filter((node) => node.kind === kind).length;

const main = async (): Promise<void> => {
  const oldProjectPath = process.env.LUTEST_PROJECT_PATH;
  const oldLegacyProjectPath = process.env.PROJECT_PATH;
  const { allowedRoot, outsideRoot } = await buildProject();
  process.env.LUTEST_PROJECT_PATH = allowedRoot;
  delete process.env.PROJECT_PATH;
  const { baseUrl, server } = await listen(createApp());

  try {
    const productionNoPath = await requestJson(baseUrl, "/api/graph/production");
    assert.equal(productionNoPath.status, 200, "production graph no path status");
    const noPathValidation = validateProductionGraphResponse(productionNoPath.body);
    assert(noPathValidation.ok, noPathValidation.ok ? "valid" : noPathValidation.message);
    if (!noPathValidation.ok) return;
    const graph = noPathValidation.value;
    assert.equal(graph.mode, "symbol-level");
    assert(countKind(graph, "page") >= 1, "page node exists");
    assert(countKind(graph, "component") >= 1, "component node exists");
    assert(countKind(graph, "api-route") >= 1, "api-route node exists");
    assert(countKind(graph, "api-client-method") >= 1, "api-client node exists");
    assert(countKind(graph, "external-endpoint") >= 1, "endpoint node exists");
    assert(graph.edges.some((edge) => edge.kind === "import"), "import edge exists");
    assert(graph.edges.some((edge) => edge.kind === "render"), "render edge exists");
    assert(graph.edges.some((edge) => edge.kind === "call"), "call edge exists");
    assert(graph.edges.some((edge) => edge.kind === "http"), "http edge exists");
    assert.equal(graph.summary.edgeCount, graph.edges.length);

    const productionAllowed = await requestJson(baseUrl, `/api/graph/production?path=${encodeURIComponent(allowedRoot)}`);
    assert.equal(productionAllowed.status, 200, "production graph allowed path status");
    assert(validateProductionGraphResponse(productionAllowed.body).ok, "allowed path validates");

    const productionAllowedAlias = await requestJson(baseUrl, `/api/graph/production?projectPath=${encodeURIComponent(allowedRoot)}`);
    assert.equal(productionAllowedAlias.status, 200, "production graph projectPath alias status");
    assert(validateProductionGraphResponse(productionAllowedAlias.body).ok, "projectPath alias validates");

    const productionOutside = await requestJson(baseUrl, `/api/graph/production?path=${encodeURIComponent(outsideRoot)}`);
    assert(
      productionOutside.status === 400 || productionOutside.status === 403,
      `outside path rejected; got ${productionOutside.status} ${JSON.stringify(productionOutside.body)}`,
    );
    assert.equal((productionOutside.body as { error?: { code?: string } }).error?.code, "PATH_NOT_ALLOWED");

    const legacy = await requestJson(baseUrl, "/api/graph");
    assert.equal(legacy.status, 200, "legacy graph status");
    assert.notEqual((legacy.body as { mode?: string }).mode, "symbol-level", "legacy graph is not production shape");

    console.log("production graph HTTP self-check passed");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (oldProjectPath === undefined) {
      delete process.env.LUTEST_PROJECT_PATH;
    } else {
      process.env.LUTEST_PROJECT_PATH = oldProjectPath;
    }
    if (oldLegacyProjectPath === undefined) {
      delete process.env.PROJECT_PATH;
    } else {
      process.env.PROJECT_PATH = oldLegacyProjectPath;
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
