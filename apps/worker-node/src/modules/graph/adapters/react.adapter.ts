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

const isJsxTsxFile = (fileName: string): boolean =>
  /\.(tsx|jsx)$/.test(fileName);

const isTestOrStoryFile = (fileName: string): boolean =>
  /\.(test|spec|stories)\.(tsx|ts|jsx|js)$/.test(fileName);

export const reactAdapter: FrameworkAdapter = {
  name: "react",

  isPage(relativePath: string): boolean {
    const fileName = getFileName(relativePath);

    if (!isJsxTsxFile(fileName)) return false;
    if (isTestOrStoryFile(fileName)) return false;

    return hasSegment(relativePath, ["pages", "routes"]);
  },

  isApi(relativePath: string): boolean {
    return hasSegment(relativePath, ["api", "services"]);
  },

  isComponent(relativePath: string): boolean {
    const fileName = getFileName(relativePath);
    const stem = getFileStem(relativePath);

    if (!isJsxTsxFile(fileName)) return false;
    if (isTestOrStoryFile(fileName)) return false;

    return hasSegment(relativePath, ["components", "ui"]) || /^[A-Z]/.test(stem);
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
