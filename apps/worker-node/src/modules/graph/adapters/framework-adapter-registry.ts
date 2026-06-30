import fs from "node:fs/promises";
import path from "node:path";
import type { DetectedFramework } from "@lutest/contracts";
import { determineFramework } from "../../project/project.mapper";
import type { FrameworkAdapter } from "./framework-adapter";
import { nextJsAdapter } from "./next-js-adapter";
import { reactAdapter } from "./react.adapter";

const defaultAdapter: FrameworkAdapter = {
  name: "unknown",

  isPage(): boolean {
    return false;
  },

  isApi(): boolean {
    return false;
  },

  isComponent(): boolean {
    return false;
  },

  classifySymbols(_relativePath, symbols) {
    return {
      pages: [],
      components: symbols.declarations,
      apis: symbols.apis,
    };
  },
};

const adapters: Partial<
  Record<NonNullable<DetectedFramework>, FrameworkAdapter>
> = {
  next: nextJsAdapter,
  react: reactAdapter,
};

const readPackageJson = async (
  rootDir: string,
): Promise<Record<string, unknown> | null> => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(rootDir, "package.json"), "utf-8"),
    );
  } catch {
    return null;
  }
};

const detectFramework = async (rootDir: string): Promise<DetectedFramework> => {
  const pkg = await readPackageJson(rootDir);
  const deps = {
    ...((pkg?.dependencies as Record<string, string> | undefined) || {}),
    ...((pkg?.devDependencies as Record<string, string> | undefined) || {}),
  };

  return determineFramework(deps);
};

const getAdapterForProject = async (
  rootDir: string,
): Promise<FrameworkAdapter> => {
  const framework = await detectFramework(rootDir);
  return (framework && adapters[framework]) || defaultAdapter;
};

export const frameworkAdapterRegistry = {
  getAdapterForProject,
};
