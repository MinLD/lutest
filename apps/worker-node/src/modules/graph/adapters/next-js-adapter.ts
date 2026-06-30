import type { FrameworkAdapter } from "./framework-adapter";

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
  return hasSegment(relativePath, ["app"]) && ["route.ts", "route.js"].includes(fileName);
};

export const nextJsAdapter: FrameworkAdapter = {
  name: "next",

  isPage(relativePath: string): boolean {
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
  },

  isApi(relativePath: string): boolean {
    const fileName = getFileName(relativePath);

    if (isAppRouteFile(relativePath)) return true;

    return isInsidePagesApi(relativePath) && isJsTsFile(fileName);
  },

  isComponent(relativePath: string): boolean {
    const fileName = getFileName(relativePath);
    const stem = getFileStem(relativePath);

    if (!isJsxTsxFile(fileName)) return false;
    if (isTestOrStoryFile(fileName)) return false;
    if (isFrameworkOrConfigFile(fileName)) return false;
    if (!isLikelyComponentPath(relativePath)) return false;

    if (hasSegment(relativePath, ["components", "ui"])) return true;

    return /^[A-Z]/.test(stem);
  },

  classifySymbols(relativePath, symbols) {
    return {
      pages: this.isPage(relativePath) ? symbols.declarations : [],
      components:
        this.isComponent(relativePath) || this.isPage(relativePath)
          ? symbols.declarations
          : [],
      apis: this.isApi(relativePath) || symbols.apis.length > 0 ? symbols.apis : [],
    };
  },
};