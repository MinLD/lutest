import type {
  GraphConfidence,
  RawSourceSymbol,
  SourceRouteInfo,
} from "../source-extractors/source-extractor.types";

export type ClassifiedGraphSymbolKind =
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility";

export type ClassifiedGraphSymbol = {
  kind: ClassifiedGraphSymbolKind;
  confidence: GraphConfidence;
  reason: string;
  route?: SourceRouteInfo;
};

export type ClassifiedFile = {
  isPageFile: boolean;
  isApiRouteFile: boolean;
  isComponentFile: boolean;
};

export interface FrameworkAdapter {
  readonly name: string;
  classifyFile(input: { relativePath: string }): ClassifiedFile;
  classifySymbol(input: {
    relativePath: string;
    symbol: RawSourceSymbol;
  }): ClassifiedGraphSymbol | null;
}

export type ClassifiedAstSymbolKind = ClassifiedGraphSymbolKind;
export type ClassifiedAstSymbol = ClassifiedGraphSymbol;
