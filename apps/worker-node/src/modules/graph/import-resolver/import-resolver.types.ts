export type ImportKind =
  | "static-import"
  | "type-import"
  | "side-effect-import"
  | "export-from"
  | "require"
  | "dynamic-import";

export type ImportLocation = {
  line: number;
  column: number;
};

export type ExtractedImport = {
  kind: ImportKind;
  sourceFilePath: string;
  specifier: string;
  loc: ImportLocation;
};

export type ResolvedImport = {
  sourceFilePath: string;
  specifier: string;
  targetFilePath: string | null;
  resolved: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
};

export type TsconfigPathPattern = {
  pattern: string;
  targets: string[];
};

export type TsconfigPathSettings = {
  configPath: string | null;
  baseUrl: string | null;
  paths: TsconfigPathPattern[];
  diagnostics: string[];
};
