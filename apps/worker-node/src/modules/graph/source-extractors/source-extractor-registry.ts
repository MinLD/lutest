import type {
  ExtractedSourceFile,
  SourceExtractor,
} from "./source-extractor.types";
import { tsJsSourceExtractor } from "./ts-js/ts-js-source-extractor";

const unsupportedSourceExtractor: SourceExtractor = {
  language: "unsupported",

  supports() {
    return false;
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
  getExtractor(filePath: string): SourceExtractor | null {
    return extractors.find((extractor) => extractor.supports(filePath)) ?? null;
  },

  isSupportedSourceFile(filePath: string): boolean {
    return this.getExtractor(filePath) !== null;
  },

  extract(input: { filePath: string; content: string }): ExtractedSourceFile {
    return (this.getExtractor(input.filePath) ?? unsupportedSourceExtractor).extract(input);
  },
};
