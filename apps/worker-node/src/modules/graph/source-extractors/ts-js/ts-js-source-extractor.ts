import type { SourceExtractor } from "../source-extractor.types";
import { parseAndExtractRawSymbols } from "./extract-ts-js-symbols";

const TS_JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const normalizePath = (filePath: String) => filePath.replaceAll("\\", "/");
const normalizePathLower = (filePath: String) =>
  normalizePath(filePath).toLowerCase();
export const tsJsSourceExtractor: SourceExtractor = {
  language: "ts-js",

  supports(filePath) {
    const normalized = normalizePathLower(filePath);
    return (
      !normalized.endsWith(".d.ts") &&
      TS_JS_EXTENSIONS.some((extension) => normalized.endsWith(extension))
    );
  },

  extract({ filePath, content }) {
    return parseAndExtractRawSymbols(normalizePathLower(filePath), content);
  },
};
