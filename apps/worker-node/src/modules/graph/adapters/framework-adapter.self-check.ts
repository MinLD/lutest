import assert from "node:assert/strict";
import { classifyExtractedSourceFile } from "./classify-extracted-source-file";
import { parseAndExtractRawSymbols } from "../source-extractors/ts-js/extract-ts-js-symbols";
import { frameworkAdapterRegistry } from "./framework-adapter-registry";
import { nextJsAdapter } from "./next-js-adapter";
import { reactAdapter } from "./react.adapter";

const firstRawSymbol = (filePath: string, content: string) => {
  const parsed = parseAndExtractRawSymbols(filePath, content);
  const [symbol] = parsed.symbols;
  assert(symbol, `raw symbol missing for ${filePath}`);
  return symbol;
};

const classify = (input: {
  framework: Parameters<typeof frameworkAdapterRegistry.getAdapterForFramework>[0];
  filePath: string;
  content: string;
}) => {
  const adapter = frameworkAdapterRegistry.getAdapterForFramework(input.framework);
  return adapter.classifySymbol({
    relativePath: input.filePath,
    symbol: firstRawSymbol(input.filePath, input.content),
  });
};

assert.equal(
  classify({
    framework: "next",
    filePath: "app/products/page.tsx",
    content: "export default function ProductsPage() { fetch('/api/products'); return <main />; }",
  })?.kind,
  "page",
);

assert.equal(
  classify({
    framework: "next",
    filePath: "app/api/products/route.ts",
    content: "export async function GET() { return Response.json([]); }",
  })?.kind,
  "api-route",
);
assert.deepEqual(
  classify({
    framework: "next",
    filePath: "app/page.tsx",
    content: "export default function HomePage() { return <main />; }",
  })?.route,
  { path: "/", kind: "page" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "app/products/page.tsx",
    content: "export default function ProductsPage() { return <main />; }",
  })?.route,
  { path: "/products", kind: "page" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "app/api/products/route.ts",
    content: "export async function GET() { return Response.json([]); }",
  })?.route,
  { path: "/api/products", kind: "api" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "pages/index.tsx",
    content: "export default function HomePage() { return <main />; }",
  })?.route,
  { path: "/", kind: "page" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "pages/api/users.ts",
    content: "export function GET() { return Response.json([]); }",
  })?.route,
  { path: "/api/users", kind: "api" },
);
assert.deepEqual(
  classify({
    framework: "next",
    filePath: "src/app/page.tsx",
    content: "export default function HomePage() { return <main />; }",
  })?.route,
  { path: "/", kind: "page" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "src/app/products/page.tsx",
    content: "export default function ProductsPage() { return <main />; }",
  })?.route,
  { path: "/products", kind: "page" },
);

const srcAppRoute = classify({
  framework: "next",
  filePath: "src/app/products/route.ts",
  content: "export async function GET() { return Response.json([]); }",
});
assert.equal(srcAppRoute?.kind, "api-route");
assert.deepEqual(srcAppRoute?.route, { path: "/products", kind: "api" });

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "src/pages/about.tsx",
    content: "export default function AboutPage() { return <main />; }",
  })?.route,
  { path: "/about", kind: "page" },
);

assert.deepEqual(
  classify({
    framework: "next",
    filePath: "src/pages/api/users.ts",
    content: "export function GET() { return Response.json([]); }",
  })?.route,
  { path: "/api/users", kind: "api" },
);


assert.equal(
  classify({
    framework: "react",
    filePath: "src/pages/Home.tsx",
    content: "export function Home() { fetch('/api/products'); return <main />; }",
  })?.kind,
  "page",
);
assert.deepEqual(
  classify({
    framework: "react",
    filePath: "src/pages/Home.tsx",
    content: "export function Home() { return <main />; }",
  })?.route,
  { path: "/home", kind: "page" },
);


assert.equal(
  frameworkAdapterRegistry.getAdapterForFramework("vite-react"),
  reactAdapter,
);
assert.equal(
  classify({
    framework: "react",
    filePath: "src/components/Button.tsx",
    content: "export function Button() { return <button />; }",
  })?.kind,
  "component",
);

assert.equal(
  classify({
    framework: "react",
    filePath: "src/components/ProductCard.tsx",
    content: "export function ProductCard() { fetch('/api/products'); return <article />; }",
  })?.kind,
  "component",
);
assert.equal(
  classify({
    framework: "react",
    filePath: "src/components/ProductCard.tsx",
    content: "export function ProductCard() { return fetch('/api/products'); }",
  })?.kind,
  "component",
);

assert.equal(
  classify({
    framework: "next",
    filePath: "src/components/ProductCard.tsx",
    content: "export function ProductCard() { fetch('/api/products'); return <article />; }",
  })?.kind,
  "component",
);

assert.equal(
  classify({
    framework: "react",
    filePath: "src/hooks/useProducts.ts",
    content: "export function useProducts() { return fetch('/api/products'); }",
  })?.kind,
  "hook",
);

assert.equal(
  classify({
    framework: "react",
    filePath: "src/api/products.ts",
    content: "export function getProducts() { return fetch('/api/products'); }",
  })?.kind,
  "api-client-method",
);

assert.equal(
  classify({
    framework: null,
    filePath: "src/lib/format.ts",
    content: "function formatMoney() { return '$1'; }",
  }),
  null,
);

assert.equal(
  classify({
    framework: "unknown",
    filePath: "src/lib/format.ts",
    content: "function formatMoney() { return '$1'; }",
  }),
  null,
);

assert.equal(
  classify({
    framework: "unknown",
    filePath: "src/components/ProductCard.tsx",
    content: "export function ProductCard() { fetch('/api/products'); return <article />; }",
  })?.kind,
  "component",
);

const duplicateParsed = parseAndExtractRawSymbols(
  "src/components/DuplicateComponents.tsx",
  "export function ProductCard() { return <article />; }\nexport const ProductCard = () => <article />;",
);
const duplicateClassified = classifyExtractedSourceFile({
  relativePath: "src/components/DuplicateComponents.tsx",
  parsed: duplicateParsed,
  adapter: reactAdapter,
}).filter((symbol) => symbol.name === "ProductCard");
assert.equal(duplicateClassified.length, 2);
assert.equal(new Set(duplicateClassified.map((symbol) => symbol.id)).size, 2);

assert.equal(
  classifyExtractedSourceFile({
    relativePath: "src/components/ProductCard.tsx",
    parsed: parseAndExtractRawSymbols(
      "src/components/ProductCard.tsx",
      "export function ProductCard() { return <article />; }",
    ),
    adapter: nextJsAdapter,
  })[0]?.kind,
  "component",
);

assert.deepEqual(
  frameworkAdapterRegistry.getLegacyAdapterForFramework("unknown").classifySymbols(
    "src/lib/format.ts",
    {
      declarations: [
        {
          name: "formatMoney",
          kind: "function",
          line: 1,
          column: 1,
        },
      ],
      apis: [],
    },
  ).components,
  [],
);

console.log("framework adapter self-check passed");
