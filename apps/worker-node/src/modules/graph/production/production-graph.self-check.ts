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

const symbolNode = (
  graph: Awaited<ReturnType<typeof buildProductionGraph>>,
  kind: string,
  filePath: string,
  name: string,
) => {
  const node = graph.nodes.find((item) => item.kind === kind && item.filePath === filePath && item.name === name);
  assert(node, `${kind} ${name} in ${filePath} missing`);
  return node;
};

const hasEdge = (
  graph: Awaited<ReturnType<typeof buildProductionGraph>>,
  kind: string,
  source: string,
  target: string,
): boolean =>
  graph.edges.some((edge) => edge.kind === kind && edge.source === source && edge.target === target);

const endpointNode = (
  graph: Awaited<ReturnType<typeof buildProductionGraph>>,
  method: string,
  endpointPath: string,
) => {
  const node = graph.nodes.find((item) => item.kind === "external-endpoint" && item.http?.method === method && item.http?.path === endpointPath);
  assert(node, `endpoint ${method} ${endpointPath} missing`);
  return node;
};
const buildMiniNextProject = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-next-production-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { next: "latest", react: "latest" } }));
  await writeFile(path.join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["*"] } } }));
  await writeFile(path.join(root, "app", "page.tsx"), `
    import React from "react";
    import ProductCard from "../components/ProductCard";
    import ProductCardAgain from "../components/ProductCard";
    import Components from "../components";
    import ProductList from "../components/ProductList";
    import { useProducts } from "../hooks/useProducts";
    import "../globals.css";
    export default function HomePage() {
      const products = useProducts();
      console.log(products);
      setTimeout(() => products, 0);
      Promise.all([]);
      fetch("/api/products");
      missingFunction();
      return <main><ProductCard /><ProductCard /><ProductList /><MissingComponent /><button /></main>;
    }
  `);
  await writeFile(path.join(root, "app", "products", "page.tsx"), `
    import ProductCard from "@/components/ProductCard";
    export default function ProductsPage() { return <main><ProductCard /></main>; }
  `);
  await writeFile(path.join(root, "app", "api", "products", "route.ts"), "export async function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "src", "app", "page.tsx"), "export default function SrcHomePage() { return <main />; }");
  await writeFile(path.join(root, "src", "app", "products", "page.tsx"), "export default function SrcProductsPage() { return <main />; }");
  await writeFile(path.join(root, "src", "app", "products", "route.ts"), "export async function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "src", "pages", "about.tsx"), "export default function AboutPage() { return <main />; }");
  await writeFile(path.join(root, "src", "pages", "api", "users.ts"), "export function GET() { return Response.json([]); }");
  await writeFile(path.join(root, "components", "ProductCard.tsx"), "export function formatMoney(value: number) { return String(value); } export function ProductCard() { return <article>{formatMoney(100)}</article>; }");
  await writeFile(path.join(root, "components", "ProductList.tsx"), `import { ProductCard } from "./ProductCard"; import { getProducts } from "../lib/api"; export function ProductList() { getProducts(); getProducts(); return <section><ProductCard /></section>; }`);
  await writeFile(path.join(root, "components", "index.ts"), "export { ProductCard } from './ProductCard'; export { ProductList } from './ProductList';");
  await writeFile(path.join(root, "components", "SameFile.tsx"), "export function helper() { return 1; } export function Parent() { helper(); return <Child />; } export function Child() { return <span />; }");
  await writeFile(path.join(root, "globals.css"), ":root {}");
  await writeFile(path.join(root, "lib", "api.ts"), `export async function getProducts() { fetch("/api/products"); return fetch("/api/products"); } export async function createOrder() { return axios.post("/api/orders"); } export async function getProductsKy() { return ky.get("/api/products"); }`);
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
  assert(hasEdge(nextGraph, "import", "file:app/page.tsx", "file:components/ProductCard.tsx"));
  assert(hasEdge(nextGraph, "import", "file:app/products/page.tsx", "file:components/ProductCard.tsx"));
  assert(hasEdge(nextGraph, "import", "file:app/page.tsx", "file:components/index.ts"));
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "import" && edge.source === "file:app/page.tsx" && edge.target === "file:components/ProductCard.tsx").length, 1);
  assert.equal(nextGraph.edges.some((edge) => edge.target === "file:globals.css"), false);
  assert.equal(nextGraph.edges.some((edge) => edge.target === "file:react"), false);

  const homePage = symbolNode(nextGraph, "page", "app/page.tsx", "HomePage");
  const productCard = symbolNode(nextGraph, "component", "components/ProductCard.tsx", "ProductCard");
  const formatMoney = symbolNode(nextGraph, "utility", "components/ProductCard.tsx", "formatMoney");
  const productList = symbolNode(nextGraph, "component", "components/ProductList.tsx", "ProductList");
  const sameFileParent = symbolNode(nextGraph, "component", "components/SameFile.tsx", "Parent");
  const sameFileHelper = symbolNode(nextGraph, "utility", "components/SameFile.tsx", "helper");
  const sameFileChild = symbolNode(nextGraph, "component", "components/SameFile.tsx", "Child");
  const useProducts = symbolNode(nextGraph, "hook", "hooks/useProducts.ts", "useProducts");
  const getProducts = symbolNode(nextGraph, "api-client-method", "lib/api.ts", "getProducts");
  const createOrder = symbolNode(nextGraph, "api-client-method", "lib/api.ts", "createOrder");
  const getProductsKy = symbolNode(nextGraph, "api-client-method", "lib/api.ts", "getProductsKy");

  assert(hasEdge(nextGraph, "render", homePage.id, productCard.id));
  assert(hasEdge(nextGraph, "render", homePage.id, productList.id));
  assert(hasEdge(nextGraph, "render", productList.id, productCard.id));
  assert(hasEdge(nextGraph, "render", sameFileParent.id, sameFileChild.id));
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "render" && edge.source === homePage.id && edge.target === productCard.id).length, 1);
  assert.equal(nextGraph.edges.some((edge) => edge.kind === "render" && edge.target.includes("MissingComponent")), false);

  assert(hasEdge(nextGraph, "call", homePage.id, useProducts.id));
  assert(hasEdge(nextGraph, "call", productCard.id, formatMoney.id));
  assert(hasEdge(nextGraph, "call", productList.id, getProducts.id));
  assert(hasEdge(nextGraph, "call", sameFileParent.id, sameFileHelper.id));
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "call" && edge.source === productList.id && edge.target === getProducts.id).length, 1);
  assert.equal(nextGraph.edges.some((edge) => edge.kind === "call" && edge.source === homePage.id && edge.target === productCard.id), false);
  assert.equal(nextGraph.edges.some((edge) => edge.kind === "call" && edge.target.includes("missingFunction")), false);
  const productsEndpoint = endpointNode(nextGraph, "GET", "/api/products");
  const ordersEndpoint = endpointNode(nextGraph, "POST", "/api/orders");
  assert(hasEdge(nextGraph, "http", getProducts.id, productsEndpoint.id));
  assert(hasEdge(nextGraph, "http", homePage.id, productsEndpoint.id));
  assert(hasEdge(nextGraph, "http", createOrder.id, ordersEndpoint.id));
  assert(hasEdge(nextGraph, "http", getProductsKy.id, productsEndpoint.id));
  assert.equal(nextGraph.nodes.filter((node) => node.kind === "external-endpoint" && node.http?.path === "/api/products").length, 1);
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "http" && edge.source === getProducts.id && edge.target === productsEndpoint.id).length, 1);
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "http" && edge.target === productsEndpoint.id).length >= 2, true);
  assert.equal(nextGraph.summary.externalEndpointCount, nextGraph.nodes.filter((node) => node.kind === "external-endpoint").length);
  assert.equal(nextGraph.summary.edgeCount, nextGraph.edges.length);

  const reactGraph = await buildProductionGraph({ rootDir: await buildMiniReactProject() });
  assertValidGraph(reactGraph);
  assert(countKind(reactGraph, "page") >= 1, "React page nodes >= 1");
  assert(countKind(reactGraph, "component") >= 1, "React component nodes >= 1");
  assert(countKind(reactGraph, "api-client-method") >= 1, "React api-client-method nodes >= 1");
  assert(countKind(reactGraph, "hook") >= 1, "React hook nodes >= 1");
  assert.equal(reactGraph.summary.edgeCount, reactGraph.edges.length);

  console.log("production graph builder self-check passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
