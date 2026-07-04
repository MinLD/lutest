import type {
  ClassifiedSourceSymbol,
  ExtractedSourceFile,
} from "../source-extractors/source-extractor.types";
import { sourceExtractorRegistry } from "../source-extractors/source-extractor-registry";
import type { FrameworkAdapter } from "./framework-adapter";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const symbolId = (kind: string, rawSymbolId: string): string =>
  `${kind}:${rawSymbolId}`;

export const classifyExtractedSourceFile = (input: {
  relativePath: string;
  parsed: ExtractedSourceFile;
  adapter: FrameworkAdapter;
}): ClassifiedSourceSymbol[] => {
  return input.parsed.symbols.flatMap((symbol) => {
    const classified = input.adapter.classifySymbol({
      relativePath: input.relativePath,
      symbol,
    });
    if (!classified) return [];
    return [
      {
        id: symbolId(classified.kind, symbol.id),
        rawSymbolId: symbol.id,
        kind: classified.kind,
        name: symbol.name,
        filePath: symbol.filePath,
        exported: symbol.exported,
        defaultExport: symbol.defaultExport,
        loc: symbol.loc,
        confidence: classified.confidence,
        reason: classified.reason,
        route: classified.route,
        hasDirectNetworkCall: symbol.hasDirectNetworkCall,
        directNetworkTargets: symbol.directNetworkTargets,
      },
    ];
  });
};

export const extractAndClassifySymbols = (input: {
  filePath: string;
  content: string;
  adapter: FrameworkAdapter;
}): ClassifiedSourceSymbol[] => {
  const parsed = sourceExtractorRegistry.extract({
    filePath: input.filePath,
    content: input.content,
  });
  return classifyExtractedSourceFile({
    relativePath: normalizePath(input.filePath),
    parsed,
    adapter: input.adapter,
  });
};
