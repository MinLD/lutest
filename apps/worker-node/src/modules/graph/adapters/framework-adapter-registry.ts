import fs from "node:fs/promises";
import path from "node:path";
import type { DetectedFramework } from "@lutest/contracts";
import { determineFramework } from "../../project/project.mapper";
import type { FrameworkAdapter } from "./framework-adapter";
import type { LegacyFrameworkAdapter } from "./legacy-framework-adapter";
import { nextJsAdapter, nextJsLegacyAdapter } from "./next-js-adapter";
import { reactAdapter, reactLegacyAdapter } from "./react.adapter";

const defaultAdapter: FrameworkAdapter = {
  name: "unknown",

  classifyFile() {
    return { isPageFile: false, isApiRouteFile: false, isComponentFile: false };
  },

  classifySymbol({ symbol }) {
    if (symbol.hookName) {
      return { kind: "hook", confidence: "high", reason: "Generic hook naming convention" };
    }
    if (symbol.hasJsx && symbol.pascalCase) {
      return { kind: "component", confidence: "medium", reason: "PascalCase symbol with JSX" };
    }
    if (symbol.hasDirectNetworkCall && !symbol.hasJsx) {
      return { kind: "api-client-method", confidence: "high", reason: "Direct network call" };
    }
    if (symbol.exported) {
      return { kind: "utility", confidence: "low", reason: "Exported symbol" };
    }
    return null;
  },
};

const defaultLegacyAdapter: LegacyFrameworkAdapter = {
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
      components: [],
      apis: symbols.apis,
    };
  },
};

type FrameworkKey = Exclude<DetectedFramework, null>;

const adapters: Partial<Record<FrameworkKey, FrameworkAdapter>> = {
  next: nextJsAdapter,
  react: reactAdapter,
  "vite-react": reactAdapter,
};

const legacyAdapters: Partial<Record<FrameworkKey, LegacyFrameworkAdapter>> = {
  next: nextJsLegacyAdapter,
  react: reactLegacyAdapter,
  "vite-react": reactLegacyAdapter,
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

const getAdapterForFramework = (
  framework: DetectedFramework,
): FrameworkAdapter => {
  return (framework && adapters[framework]) || defaultAdapter;
};

const getLegacyAdapterForFramework = (
  framework: DetectedFramework,
): LegacyFrameworkAdapter => {
  return (framework && legacyAdapters[framework]) || defaultLegacyAdapter;
};

const getAdapterForProject = async (
  rootDir: string,
): Promise<FrameworkAdapter> => {
  const framework = await detectFramework(rootDir);
  return getAdapterForFramework(framework);
};

const getLegacyAdapterForProject = async (
  rootDir: string,
): Promise<LegacyFrameworkAdapter> => {
  const framework = await detectFramework(rootDir);
  return getLegacyAdapterForFramework(framework);
};

export const frameworkAdapterRegistry = {
  getAdapterForFramework,
  getAdapterForProject,
  getLegacyAdapterForFramework,
  getLegacyAdapterForProject,
};

