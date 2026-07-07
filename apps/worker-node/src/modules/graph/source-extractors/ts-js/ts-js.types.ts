import type { SourceFileKind } from "../source-extractor.types";

export type TsJsSourceFileKind = Extract<
  SourceFileKind,
  "ts" | "tsx" | "js" | "jsx"
>;
