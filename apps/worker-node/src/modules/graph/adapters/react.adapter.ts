import type { FrameworkAdapter } from "./framework-adapter";
import type { LegacyFrameworkAdapter } from "./legacy-framework-adapter";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const getPathSegments = (relativePath: string): string[] =>
  normalizePath(relativePath).split("/").filter(Boolean);

const getFileName = (relativePath: string): string =>
  getPathSegments(relativePath).at(-1) ?? "";

const getFileStem = (relativePath: string): string => {
  const fileName = getFileName(relativePath);
  return fileName.replace(/\.[^.]+$/, "");
};

const hasSegment = (relativePath: string, segments: string[]): boolean => {
  const pathSegments = getPathSegments(relativePath);
  return segments.some((segment) => pathSegments.includes(segment));
};

const isJsxTsxFile = (fileName: string): boolean =>
  /\.(tsx|jsx)$/.test(fileName);

const isTestOrStoryFile = (fileName: string): boolean =>
  /\.(test|spec|stories)\.(tsx|ts|jsx|js)$/.test(fileName);

const isPage = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  if (!isJsxTsxFile(fileName)) return false;
  if (isTestOrStoryFile(fileName)) return false;

  return hasSegment(relativePath, ["pages", "routes"]);
};

const isApi = (relativePath: string): boolean =>
  hasSegment(relativePath, ["api", "services"]);

const isComponent = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);
  const stem = getFileStem(relativePath);

  if (!isJsxTsxFile(fileName)) return false;
  if (isTestOrStoryFile(fileName)) return false;

  return hasSegment(relativePath, ["components", "ui"]) || /^[A-Z]/.test(stem);
};

export const reactAdapter: FrameworkAdapter = {
  name: "react",

  classifyFile({ relativePath }) {
    return {
      isPageFile: isPage(relativePath),
      isApiRouteFile: isApi(relativePath),
      isComponentFile: isComponent(relativePath),
    };
  },

  classifySymbol({ relativePath, symbol }) {
    const file = this.classifyFile({ relativePath });
    if (symbol.hookName) {
      return { kind: "hook", confidence: "high", reason: "React hook naming convention" };
    }
    if (file.isPageFile && symbol.pascalCase && symbol.hasJsx) {
      return { kind: "page", confidence: "high", reason: "React route/page component file" };
    }
    if (symbol.hasJsx && symbol.pascalCase) {
      return { kind: "component", confidence: "high", reason: "PascalCase symbol with JSX" };
    }
    if (symbol.hasDirectNetworkCall && !symbol.hasJsx) {
      return { kind: "api-client-method", confidence: "high", reason: "Direct network call inside function" };
    }
    if (symbol.pascalCase && file.isComponentFile) {
      return { kind: "component", confidence: "medium", reason: "PascalCase symbol in React component path" };
    }
    if (symbol.exported) {
      return { kind: "utility", confidence: "low", reason: "Exported symbol without framework-specific role" };
    }
    return null;
  },
};

export const reactLegacyAdapter: LegacyFrameworkAdapter = {
  name: "react",
  isPage,
  isApi,
  isComponent,

  classifySymbols(relativePath, symbols) {
    return {
      pages: isPage(relativePath) ? symbols.declarations : [],
      components:
        isComponent(relativePath) || isPage(relativePath)
          ? symbols.declarations
          : [],
      apis: isApi(relativePath) || symbols.apis.length > 0 ? symbols.apis : [],
    };
  },
};

