import type { SourceExtractor } from "../source-extractor.types";
import { parseAndExtractRawSymbols } from "./extract-ts-js-symbols";

const TS_JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const IGNORED_FILE_REGEX = /\.(d|test|spec|stories)\.(tsx|ts|jsx|js)$/;

const normalizePath = (filePath: string): string => filePath.replaceAll("\\", "/");
const normalizePathLower = (filePath: string): string =>
  normalizePath(filePath).toLowerCase();

export const tsJsSourceExtractor: SourceExtractor = {
  language: "ts-js",

  supports(filePath) {
    const normalized = normalizePathLower(filePath);
    return (
      !IGNORED_FILE_REGEX.test(normalized) &&
      TS_JS_EXTENSIONS.some((extension) => normalized.endsWith(extension))
    );
  },

  extract({ filePath, content }) {
    return parseAndExtractRawSymbols(normalizePath(filePath), content);
  },
};
