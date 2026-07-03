import assert from "node:assert/strict";
import { sourceExtractorRegistry } from "../source-extractor-registry";
import { parseTsJsSourceFile } from "./parse-ts-js-source-file";
import { tsJsSourceExtractor } from "./ts-js-source-extractor";

const extract = (filePath: string, content: string) =>
  tsJsSourceExtractor.extract({ filePath, content });

const productCard = extract(
  "src/components/ProductCard.tsx",
  "export function ProductCard() { return <article />; }",
).symbols.find((symbol) => symbol.name === "ProductCard");
assert(productCard, "ProductCard raw symbol missing");
assert.equal(productCard.pascalCase, true);
assert.equal(productCard.hasJsx, true);

const useProducts = extract(
  "src/hooks/useProducts.ts",
  "export function useProducts() { return []; }",
).symbols.find((symbol) => symbol.name === "useProducts");
assert(useProducts, "useProducts raw symbol missing");
assert.equal(useProducts.hookName, true);

const getProducts = extract(
  "src/api/products.ts",
  "export async function getProducts() { return fetch('/api/products'); }",
).symbols.find((symbol) => symbol.name === "getProducts");
assert(getProducts, "getProducts raw symbol missing");
assert.deepEqual(getProducts.directNetworkTargets, [
  { client: "fetch", target: "/api/products", line: 1 },
]);

const vueResult = sourceExtractorRegistry.extract({
  filePath: "src/components/ProductCard.vue",
  content: "<template><div /></template>",
});
assert.equal(vueResult.kind, "unsupported");
assert.equal(vueResult.language, "unsupported");
assert.equal(vueResult.symbols.length, 0);
assert(vueResult.parseDiagnostics[0]?.includes("Unsupported source file type"));

const phpResult = sourceExtractorRegistry.extract({
  filePath: "routes/web.php",
  content: "<?php echo 'ok';",
});
assert.equal(phpResult.kind, "unsupported");
assert.equal(phpResult.language, "unsupported");
assert.equal(phpResult.symbols.length, 0);
assert(phpResult.parseDiagnostics[0]?.includes("Unsupported source file type"));

const declarationResult = sourceExtractorRegistry.extract({
  filePath: "src/types/global.d.ts",
  content: "declare global { interface Window { app: string } }",
});
assert.equal(declarationResult.kind, "unsupported");
assert.equal(declarationResult.symbols.length, 0);
assert.equal(tsJsSourceExtractor.supports("next-env.d.ts"), false);
assert.equal(parseTsJsSourceFile("src/types/global.d.ts", "declare const x: string").sourceFile, null);

const duplicateMethods = extract(
  "src/components/DuplicateMethods.tsx",
  "class A { render() {} }\nclass B { render() {} }",
).symbols.filter((symbol) => symbol.name === "render");
assert.equal(duplicateMethods.length, 2);
assert.equal(new Set(duplicateMethods.map((symbol) => symbol.id)).size, 2);
assert(duplicateMethods.every((symbol) => /@\d+-\d+$/.test(symbol.id)));

const nestedOnly = extract(
  "src/components/NestedOnly.tsx",
  `export function ProductCard() {
    function load() { fetch('/api/products'); }
    function View() { return <div />; }
    return null;
  }`,
).symbols.find((symbol) => symbol.name === "ProductCard");
assert(nestedOnly, "ProductCard nested-only raw symbol missing");
assert.equal(nestedOnly.hasDirectNetworkCall, false);
assert.equal(nestedOnly.hasJsx, false);

console.log("ts-js source extractor self-check passed");
