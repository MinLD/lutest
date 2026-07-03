import type { SourceExtractor } from "./source-extractor.types";
import { tsJsSourceExtractor } from "./ts-js/ts-js-source-extractor";

const unsupportedSourceExtractor: SourceExtractor = {
  language: "unsupported",

  supports() {
    return true;
  },

  extract({ filePath }) {
    return {
      filePath,
      kind: "unsupported",
      language: "unsupported",
      symbols: [],
      parseDiagnostics: [`Unsupported source file type: ${filePath}`],
    };
  },
};

const extractors = [tsJsSourceExtractor];

export const sourceExtractorRegistry = {
  getExtractor(filePath: string): SourceExtractor {
    return (
      extractors.find((extractor) => extractor.supports(filePath)) ??
      unsupportedSourceExtractor
    );
  },

  extract(input: { filePath: string; content: string }) {
    return this.getExtractor(input.filePath).extract(input);
  },
};
