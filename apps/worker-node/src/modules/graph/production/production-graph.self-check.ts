import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateProductionGraphResponse } from "@lutest/contracts";
import { buildProductionGraph } from "./production-graph-builder";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const countKind = (graph: Awaited<ReturnType<typeof buildProductionGraph>>, kind: string) =>
  graph.nodes.filter((node) => node.kind === kind).length;

const assertNoNodeFor = (graph: Awaited<ReturnType<typeof buildProductionGraph>>, fragment: string): void => {
  assert.equal(
    graph.nodes.some((node) => node.filePath?.includes(fragment)),
    false,
    `${fragment} should not produce production graph nodes`,
  );
};

const buildMiniNextProject = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-next-production-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { next: "latest", react: "latest" } }));
  await writeFile(path.join(root, "app", "page.tsx"), "export default function HomePage() { return <main />; }");
  await writeFile(path.join(root, "app", "products", "page.tsx"), "export default function ProductsPage() { return <main />; }");
  await writeFile(path.join(root, "app", "api", "products", "route.ts"), "export async function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "src", "app", "page.tsx"), "export default function SrcHomePage() { return <main />; }");
  await writeFile(path.join(root, "src", "app", "products", "page.tsx"), "export default function SrcProductsPage() { return <main />; }");
  await writeFile(path.join(root, "src", "app", "products", "route.ts"), "export async function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "src", "pages", "about.tsx"), "export default function AboutPage() { return <main />; }");
  await writeFile(path.join(root, "src", "pages", "api", "users.ts"), "export function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "components", "ProductCard.tsx"), "export function ProductCard() { return <article />; }");
  await writeFile(path.join(root, "components", "ProductList.tsx"), "export function ProductList() { return <section />; }");
  await writeFile(path.join(root, "lib", "api.ts"), "export async function getProducts() { return fetch('/api/products'); }");
  await writeFile(path.join(root, "hooks", "useProducts.ts"), "export function useProducts() { return []; }");
  await writeFile(path.join(root, "next-env.d.ts"), "/// <reference types='next' />");
  await writeFile(path.join(root, "components", "ProductCard.test.tsx"), "export function ProductCardTest() { return <div />; }");
  return root;
};

const buildMiniReactProject = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-react-production-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { vite: "latest", react: "latest" } }));
  await writeFile(path.join(root, "src", "pages", "Home.tsx"), "export function Home() { return <main />; }");
  await writeFile(path.join(root, "src", "components", "Button.tsx"), "export function Button() { return <button />; }");
  await writeFile(path.join(root, "src", "services", "products.ts"), "export async function getProducts() { return fetch('/api/products'); }");
  await writeFile(path.join(root, "src", "hooks", "useProducts.ts"), "export function useProducts() { return []; }");
  return root;
};

const assertValidGraph = (graph: Awaited<ReturnType<typeof buildProductionGraph>>): void => {
  const validation = validateProductionGraphResponse(graph);
  assert(validation.ok, validation.ok ? "graph valid" : validation.message);
  assert.equal(graph.mode, "symbol-level");
};

const main = async (): Promise<void> => {
  const nextGraph = await buildProductionGraph({ rootDir: await buildMiniNextProject() });
  assertValidGraph(nextGraph);
  assert(countKind(nextGraph, "page") >= 2, "Next page nodes >= 2");
  assert(countKind(nextGraph, "component") >= 2, "Next component nodes >= 2");
  assert(countKind(nextGraph, "api-route") >= 1, "Next api-route nodes >= 1");
  assert(countKind(nextGraph, "api-client-method") >= 1, "Next api-client-method nodes >= 1");
  assert(countKind(nextGraph, "hook") >= 1, "Next hook nodes >= 1");
  assertNoNodeFor(nextGraph, "next-env.d.ts");
  assertNoNodeFor(nextGraph, "ProductCard.test.tsx");
  assert(nextGraph.nodes.some((node) => node.kind === "page" && node.route?.path === "/"));
  assert(nextGraph.nodes.some((node) => node.kind === "page" && node.route?.path === "/products"));
  assert(nextGraph.nodes.some((node) => node.kind === "api-route" && node.route?.path === "/api/products"));
  assert(nextGraph.nodes.every((node) => !/^(component:component:|page:page:|api-route:api-route:)/.test(node.id)));
  assert(nextGraph.nodes.some((node) => node.kind === "page" && node.route?.path === "/about"));
  assert(nextGraph.nodes.some((node) => node.kind === "api-route" && node.route?.path === "/products" && node.route.kind === "api"));
  assert(nextGraph.nodes.some((node) => node.kind === "api-route" && node.route?.path === "/api/users" && node.route.kind === "api"));
  assert.equal(nextGraph.summary.edgeCount, 0);

  const reactGraph = await buildProductionGraph({ rootDir: await buildMiniReactProject() });
  assertValidGraph(reactGraph);
  assert(countKind(reactGraph, "page") >= 1, "React page nodes >= 1");
  assert(countKind(reactGraph, "component") >= 1, "React component nodes >= 1");
  assert(countKind(reactGraph, "api-client-method") >= 1, "React api-client-method nodes >= 1");
  assert(countKind(reactGraph, "hook") >= 1, "React hook nodes >= 1");
  assert.equal(reactGraph.summary.edgeCount, 0);

  console.log("production graph builder self-check passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
