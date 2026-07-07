import assert from "node:assert/strict";
import { nextJsAdapter } from "../adapters/next-js-adapter";
import {
  classifyExtractedSourceFile,
  extractAndClassifySymbols,
} from "../adapters/classify-extracted-source-file";
import { parseAndExtractRawSymbols } from "../source-extractors/ts-js/extract-ts-js-symbols";

const rawSymbolsFor = (filePath: string, content: string) =>
  parseAndExtractRawSymbols(filePath, content).symbols;

const classifiedSymbolsFor = (filePath: string, content: string) =>
  extractAndClassifySymbols({ filePath, content, adapter: nextJsAdapter });

const hasRawSymbol = (
  filePath: string,
  content: string,
  expected: { name: string; rawKind: string },
): void => {
  const rawSymbols = rawSymbolsFor(filePath, content);
  assert(
    rawSymbols.some(
      (symbol) =>
        symbol.name === expected.name && symbol.rawKind === expected.rawKind,
    ),
    `${expected.rawKind} ${expected.name} not found in ${filePath}: ${JSON.stringify(rawSymbols)}`,
  );
};

const hasClassifiedSymbol = (
  filePath: string,
  content: string,
  expected: { name: string; kind: string },
): void => {
  const symbols = classifiedSymbolsFor(filePath, content);
  assert(
    symbols.some(
      (symbol) => symbol.name === expected.name && symbol.kind === expected.kind,
    ),
    `${expected.kind} ${expected.name} not found in ${filePath}: ${JSON.stringify(symbols)}`,
  );
};

hasRawSymbol(
  "src/components/ProductCard.tsx",
  "export function ProductCard() { return <div />; }",
  { name: "ProductCard", rawKind: "function" },
);

const componentRaw = rawSymbolsFor(
  "src/components/ProductGrid.tsx",
  "export const ProductGrid = () => <section />;",
);
const productGrid = componentRaw.find((symbol) => symbol.name === "ProductGrid");
assert(productGrid, `ProductGrid raw symbol missing: ${JSON.stringify(componentRaw)}`);
assert.equal(productGrid.pascalCase, true);
assert.equal(productGrid.hasJsx, true);
assert.equal(productGrid.rawKind, "arrow-function");

const hookRaw = rawSymbolsFor(
  "src/hooks/useProducts.ts",
  "export function useProducts() { return []; }",
);
const useProducts = hookRaw.find((symbol) => symbol.name === "useProducts");
assert(useProducts, `useProducts raw symbol missing: ${JSON.stringify(hookRaw)}`);
assert.equal(useProducts.hookName, true);

const apiClientRaw = rawSymbolsFor(
  "src/api/products.ts",
  "export async function getProducts() { return fetch('/api/products'); }",
);
const getProducts = apiClientRaw.find((symbol) => symbol.name === "getProducts");
assert(getProducts, `getProducts raw symbol missing: ${JSON.stringify(apiClientRaw)}`);
assert.equal(getProducts.hasDirectNetworkCall, true);
assert.deepEqual(getProducts.directNetworkTargets, [
  { client: "fetch", target: "/api/products", line: 1 },
]);

const lowercaseHelper = parseAndExtractRawSymbols(
  "src/lib/format.ts",
  "function formatMoney() { return '$1'; }",
);
assert(
  lowercaseHelper.symbols.some((symbol) => symbol.name === "formatMoney"),
  `generic extractor should keep raw lowercase helper: ${JSON.stringify(lowercaseHelper.symbols)}`,
);
assert.deepEqual(
  classifyExtractedSourceFile({
    relativePath: "src/lib/format.ts",
    parsed: lowercaseHelper,
    adapter: nextJsAdapter,
  }),
  [],
);

hasClassifiedSymbol(
  "app/products/page.tsx",
  "export default function ProductsPage() { return <main />; }",
  { name: "ProductsPage", kind: "page" },
);

hasClassifiedSymbol(
  "app/api/products/route.ts",
  "export async function GET() { return Response.json([]); }",
  { name: "GET", kind: "api-route" },
);

hasClassifiedSymbol(
  "src/components/ProductCard.tsx",
  "export function ProductCard() { return <div />; }",
  { name: "ProductCard", kind: "component" },
);

hasClassifiedSymbol(
  "src/api/products.ts",
  "export async function getProducts() { return fetch('/api/products'); }",
  { name: "getProducts", kind: "api-client-method" },
);

const parseIssue = parseAndExtractRawSymbols("src/broken.ts", "export function Broken( {");
assert(parseIssue.parseDiagnostics.length > 0, "parse diagnostics collected");

console.log("ast symbol self-check passed");



