import type { FrameworkAdapter } from "./framework-adapter";
import type { LegacyFrameworkAdapter } from "./legacy-framework-adapter";

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

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

const isJsTsFile = (fileName: string): boolean => /\.(tsx|ts|jsx|js)$/.test(fileName);

const isJsxTsxFile = (fileName: string): boolean => /\.(tsx|jsx)$/.test(fileName);

const isTestOrStoryFile = (fileName: string): boolean =>
  /\.(test|spec|stories)\.(tsx|ts|jsx|js)$/.test(fileName);

const isFrameworkOrConfigFile = (fileName: string): boolean =>
  /(^|\.)(config|setup)\.(tsx|ts|jsx|js)$/.test(fileName) ||
  [
    "next-env.d.ts",
    "middleware.ts",
    "middleware.js",
    "instrumentation.ts",
    "instrumentation.js",
  ].includes(fileName);

const isLikelyComponentPath = (relativePath: string): boolean =>
  hasSegment(relativePath, ["app", "pages", "src", "components", "ui"]);

const isInsidePagesApi = (relativePath: string): boolean => {
  const segments = getPathSegments(relativePath);
  const pagesIndex = segments.indexOf("pages");

  return pagesIndex >= 0 && segments[pagesIndex + 1] === "api";
};

const isAppRouteFile = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);
  return hasSegment(relativePath, ["app"]) && ["route.ts", "route.tsx", "route.js", "route.jsx"].includes(fileName);
};

const isPage = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  if (!isJsTsFile(fileName)) return false;
  if (isTestOrStoryFile(fileName)) return false;

  if (
    hasSegment(relativePath, ["app"]) &&
    ["page.tsx", "page.ts", "page.jsx", "page.js"].includes(fileName)
  ) {
    return true;
  }

  if (hasSegment(relativePath, ["pages"])) {
    if (isInsidePagesApi(relativePath)) return false;
    if (fileName.startsWith("_")) return false;

    return true;
  }

  return false;
};

const isApi = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  if (isAppRouteFile(relativePath)) return true;

  return isInsidePagesApi(relativePath) && isJsTsFile(fileName);
};

const isComponent = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);
  const stem = getFileStem(relativePath);

  if (!isJsxTsxFile(fileName)) return false;
  if (isTestOrStoryFile(fileName)) return false;
  if (isFrameworkOrConfigFile(fileName)) return false;
  if (!isLikelyComponentPath(relativePath)) return false;

  if (hasSegment(relativePath, ["components", "ui"])) return true;

  return /^[A-Z]/.test(stem);
};

export const nextJsAdapter: FrameworkAdapter = {
  name: "next",

  classifyFile({ relativePath }) {
    return {
      isPageFile: isPage(relativePath),
      isApiRouteFile: isApi(relativePath),
      isComponentFile: isComponent(relativePath),
    };
  },

  classifySymbol({ relativePath, symbol }) {
    const file = this.classifyFile({ relativePath });

    if (
      file.isPageFile &&
      (symbol.defaultExport || (symbol.pascalCase && symbol.hasJsx))
    ) {
      return { kind: "page", confidence: "high", reason: "Next page file component export" };
    }

    if (file.isApiRouteFile && HTTP_METHODS.has(symbol.name)) {
      return { kind: "api-route", confidence: "high", reason: "HTTP method handler in Next API route file" };
    }

    if (symbol.hookName) {
      return { kind: "hook", confidence: "high", reason: "React hook naming convention" };
    }

    if (symbol.hasJsx && symbol.pascalCase) {
      return { kind: "component", confidence: "high", reason: "PascalCase symbol with JSX" };
    }

    if (symbol.pascalCase && file.isComponentFile) {
      return { kind: "component", confidence: "medium", reason: "PascalCase symbol in Next component path" };
    }

    if (symbol.hasDirectNetworkCall && !symbol.hasJsx) {
      return { kind: "api-client-method", confidence: "high", reason: "Direct network call inside function" };
    }

    if (symbol.exported) {
      return { kind: "utility", confidence: "low", reason: "Exported symbol without framework-specific role" };
    }

    return null;
  },
};

export const nextJsLegacyAdapter: LegacyFrameworkAdapter = {
  name: "next",
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

