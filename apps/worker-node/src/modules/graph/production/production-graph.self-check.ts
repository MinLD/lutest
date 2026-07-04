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
    import "../globals.css";
    export default function HomePage() { return <main><ProductCard /><ProductCard /><ProductList /><MissingComponent /><button /></main>; }
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
  await writeFile(path.join(root, "components", "ProductCard.tsx"), "export function ProductCard() { return <article />; }");
  await writeFile(path.join(root, "components", "ProductList.tsx"), `import { ProductCard } from "./ProductCard"; export function ProductList() { return <section><ProductCard /></section>; }`);
  await writeFile(path.join(root, "components", "index.ts"), "export { ProductCard } from './ProductCard'; export { ProductList } from './ProductList';");
  await writeFile(path.join(root, "components", "SameFile.tsx"), "export function Parent() { return <Child />; } export function Child() { return <span />; }");
  await writeFile(path.join(root, "globals.css"), ":root {}");
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
  assert(hasEdge(nextGraph, "import", "file:app/page.tsx", "file:components/ProductCard.tsx"));
  assert(hasEdge(nextGraph, "import", "file:app/products/page.tsx", "file:components/ProductCard.tsx"));
  assert(hasEdge(nextGraph, "import", "file:app/page.tsx", "file:components/index.ts"));
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "import" && edge.source === "file:app/page.tsx" && edge.target === "file:components/ProductCard.tsx").length, 1);
  assert.equal(nextGraph.edges.some((edge) => edge.target === "file:globals.css"), false);
  assert.equal(nextGraph.edges.some((edge) => edge.target === "file:react"), false);

  const homePage = symbolNode(nextGraph, "page", "app/page.tsx", "HomePage");
  const productCard = symbolNode(nextGraph, "component", "components/ProductCard.tsx", "ProductCard");
  const productList = symbolNode(nextGraph, "component", "components/ProductList.tsx", "ProductList");
  const sameFileParent = symbolNode(nextGraph, "component", "components/SameFile.tsx", "Parent");
  const sameFileChild = symbolNode(nextGraph, "component", "components/SameFile.tsx", "Child");
  assert(hasEdge(nextGraph, "render", homePage.id, productCard.id));
  assert(hasEdge(nextGraph, "render", homePage.id, productList.id));
  assert(hasEdge(nextGraph, "render", productList.id, productCard.id));
  assert(hasEdge(nextGraph, "render", sameFileParent.id, sameFileChild.id));
  assert.equal(nextGraph.edges.filter((edge) => edge.kind === "render" && edge.source === homePage.id && edge.target === productCard.id).length, 1);
  assert.equal(nextGraph.edges.some((edge) => edge.kind === "render" && edge.target.includes("MissingComponent")), false);
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
