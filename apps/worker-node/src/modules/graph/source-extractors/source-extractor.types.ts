export type SourceFileKind =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "vue"
  | "php"
  | "unsupported";

export type ExtractorLanguage = "ts-js" | "vue" | "php" | "unsupported";

export type GraphConfidence = "high" | "medium" | "low";

export type RawSymbolKind =
  | "function"
  | "class"
  | "arrow-function"
  | "function-expression"
  | "method"
  | "vue-script-setup"
  | "php-class"
  | "php-method"
  | "unknown";

export type DirectNetworkTarget = {
  client: string;
  method?: string;
  target: string;
  line: number;
};

export type RawSourceSymbol = {
  id: string;
  rawKind: RawSymbolKind;
  name: string;
  filePath: string;
  exported: boolean;
  defaultExport: boolean;
  pascalCase: boolean;
  hookName: boolean;
  hasJsx: boolean;
  hasDirectNetworkCall: boolean;
  directNetworkTargets: DirectNetworkTarget[];
  loc: {
    startLine: number;
    endLine: number;
  };
};

export type ClassifiedSourceSymbolKind =
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility";

export type ClassifiedSourceSymbol = {
  id: string;
  kind: ClassifiedSourceSymbolKind;
  name: string;
  filePath: string;
  exported: boolean;
  defaultExport: boolean;
  loc: {
    startLine: number;
    endLine: number;
  };
  confidence: GraphConfidence;
  reason: string;
};

export type ExtractedSourceFile = {
  filePath: string;
  kind: SourceFileKind;
  language: ExtractorLanguage;
  symbols: RawSourceSymbol[];
  parseDiagnostics: string[];
};

export interface SourceExtractor {
  readonly language: ExtractorLanguage;

  supports(filePath: string): boolean;

  extract(input: {
    filePath: string;
    content: string;
  }): ExtractedSourceFile;
}

export type AstConfidence = GraphConfidence;
export type RawAstSymbolKind = RawSymbolKind;
export type RawAstSymbol = RawSourceSymbol;
export type AstSymbolKind = ClassifiedSourceSymbolKind;
export type AstSymbolDeclaration = ClassifiedSourceSymbol;
export type ParsedSourceFile = ExtractedSourceFile;
