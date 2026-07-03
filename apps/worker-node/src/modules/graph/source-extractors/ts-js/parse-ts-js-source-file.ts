import ts from "typescript";
import type { SourceFileKind } from "../source-extractor.types";

export type ParsedTsJsSourceFile = {
  filePath: string;
  kind: SourceFileKind;
  sourceFile: ts.SourceFile | null;
  parseDiagnostics: string[];
};

type SourceFileWithParseDiagnostics = ts.SourceFile & {
  parseDiagnostics?: readonly ts.Diagnostic[];
};

const getSourceFileKind = (filePath: string): SourceFileKind => {
  if (filePath.endsWith(".d.ts")) return "unsupported";
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "js";
  return "unsupported";
};

const getScriptKind = (kind: SourceFileKind): ts.ScriptKind | null => {
  if (kind === "tsx") return ts.ScriptKind.TSX;
  if (kind === "jsx") return ts.ScriptKind.JSX;
  if (kind === "js") return ts.ScriptKind.JS;
  if (kind === "ts") return ts.ScriptKind.TS;
  return null;
};

const formatDiagnostic = (
  sourceFile: ts.SourceFile,
  diagnostic: ts.Diagnostic,
): string => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (diagnostic.start === undefined) return message;
  const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
  return `${position.line + 1}:${position.character + 1} ${message}`;
};

export const parseTsJsSourceFile = (
  filePath: string,
  content: string,
): ParsedTsJsSourceFile => {
  const kind = getSourceFileKind(filePath);
  const scriptKind = getScriptKind(kind);
  if (scriptKind === null) {
    return {
      filePath,
      kind,
      sourceFile: null,
      parseDiagnostics: [`Unsupported TS/JS source file type: ${filePath}`],
    };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const diagnostics = (sourceFile as SourceFileWithParseDiagnostics)
    .parseDiagnostics ?? [];

  return {
    filePath,
    kind,
    sourceFile,
    parseDiagnostics: diagnostics.map((diagnostic) =>
      formatDiagnostic(sourceFile, diagnostic),
    ),
  };
};

