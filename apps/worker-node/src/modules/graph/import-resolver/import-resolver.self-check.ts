import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractTsJsImports } from "./extract-ts-js-imports";
import { resolveImportTarget } from "./resolve-import-target";
import { readTsconfigPathSettings } from "./tsconfig-paths";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const main = async (): Promise<void> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-import-resolver-"));

  await writeFile(path.join(root, "src", "App.tsx"), `
    import React from "react";
    import type { User } from "@/types";
    import "./globals.css";
    import Button from "./Button";
    import Components from "./components";
    import Lib from "@lib/api";
    export { format } from "./utils";
    export * from "./more-utils";
    const legacy = require("./legacy");
    const lazy = await import("./lazy");
    import("./dynamic-expression-ignored" + name);
    import Missing from "./missing";
  `);
  await writeFile(path.join(root, "src", "Button.tsx"), "export function Button() { return null; }");
  await writeFile(path.join(root, "src", "components", "index.ts"), "export const Components = {}; ");
  await writeFile(path.join(root, "src", "lib", "api.ts"), "export const api = {}; ");
  await writeFile(path.join(root, "src", "utils.ts"), "export const format = () => ''; ");
  await writeFile(path.join(root, "src", "more-utils.ts"), "export const more = {}; ");
  await writeFile(path.join(root, "src", "legacy.js"), "module.exports = {}; ");
  await writeFile(path.join(root, "src", "lazy.tsx"), "export default function Lazy() { return null; }");
  await writeFile(path.join(root, "src", "globals.css"), ":root {} ");
  await writeFile(path.join(root, "src", "types.ts"), "export type User = { id: string }; ");
  await writeFile(path.join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
        "@lib/*": ["src/lib/*"],
      },
    },
  }));

  const appPath = path.join(root, "src", "App.tsx");
  const imports = extractTsJsImports({
    sourceFilePath: "src/App.tsx",
    content: await fs.readFile(appPath, "utf-8"),
  });
  const bySpecifier = (specifier: string) => imports.filter((item) => item.specifier === specifier);

  assert.equal(bySpecifier("react")[0]?.kind, "static-import");
  assert.equal(bySpecifier("@/types")[0]?.kind, "type-import");
  assert.equal(bySpecifier("./globals.css")[0]?.kind, "side-effect-import");
  assert.equal(bySpecifier("./utils")[0]?.kind, "export-from");
  assert.equal(bySpecifier("./more-utils")[0]?.kind, "export-from");
  assert.equal(bySpecifier("./legacy")[0]?.kind, "require");
  assert.equal(bySpecifier("./lazy")[0]?.kind, "dynamic-import");
  assert.equal(bySpecifier("./dynamic-expression-ignored").length, 0);

  const settings = await readTsconfigPathSettings(root);
  const resolve = (specifier: string) =>
    resolveImportTarget({ projectRoot: root, sourceFilePath: "src/App.tsx", specifier, tsconfig: settings });

  assert.deepEqual(await resolve("./Button"), {
    sourceFilePath: "src/App.tsx",
    specifier: "./Button",
    targetFilePath: "src/Button.tsx",
    resolved: true,
    reason: "relative-match",
    confidence: "high",
  });
  assert.equal((await resolve("./components")).targetFilePath, "src/components/index.ts");
  assert.equal((await resolve("@/components/Button")).targetFilePath, null);
  await writeFile(path.join(root, "src", "components", "Button.tsx"), "export const Button = null; ");
  assert.equal((await resolve("@/components/Button")).targetFilePath, "src/components/Button.tsx");
  assert.equal((await resolve("@lib/api")).targetFilePath, "src/lib/api.ts");
  assert.equal((await resolve("react")).reason, "external-package");
  assert.equal((await resolve("./globals.css")).resolved, false);
  assert.equal((await resolve("./globals.css")).reason, "target-not-found");
  assert.equal((await resolve("./missing")).reason, "target-not-found");

  const malformedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-import-bad-config-"));
  await writeFile(path.join(malformedRoot, "tsconfig.json"), "{ bad json");
  await writeFile(path.join(malformedRoot, "src", "App.tsx"), "import './Button';");
  await writeFile(path.join(malformedRoot, "src", "Button.tsx"), "export const Button = null;");
  const badSettings = await readTsconfigPathSettings(malformedRoot);
  assert.equal(badSettings.diagnostics.length > 0, true);
  const malformedResolved = await resolveImportTarget({
    projectRoot: malformedRoot,
    sourceFilePath: "src/App.tsx",
    specifier: "./Button",
    tsconfig: badSettings,
  });
  assert.equal(malformedResolved.resolved, false);
  assert.equal(malformedResolved.reason, "config-invalid");

  console.log("import resolver self-check passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
