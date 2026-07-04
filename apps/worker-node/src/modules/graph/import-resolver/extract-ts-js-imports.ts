import ts from "typescript";
import type { ExtractedImport, ImportKind } from "./import-resolver.types";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const locFor = (sourceFile: ts.SourceFile, node: ts.Node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
};

const pushImport = (input: {
  imports: ExtractedImport[];
  sourceFile: ts.SourceFile;
  sourceFilePath: string;
  node: ts.Node;
  kind: ImportKind;
  specifier: string;
}): void => {
  input.imports.push({
    kind: input.kind,
    sourceFilePath: normalizePath(input.sourceFilePath),
    specifier: input.specifier,
    loc: locFor(input.sourceFile, input.node),
  });
};

const isStringLiteralSpecifier = (node: ts.Node): node is ts.StringLiteral =>
  ts.isStringLiteral(node);

const extractRequireSpecifier = (node: ts.CallExpression): string | null => {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== "require") return null;
  const [first] = node.arguments;
  return first && ts.isStringLiteralLike(first) ? first.text : null;
};

const extractDynamicImportSpecifier = (node: ts.CallExpression): string | null => {
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return null;
  const [first] = node.arguments;
  return first && ts.isStringLiteralLike(first) ? first.text : null;
};

export const extractTsJsImports = (input: {
  sourceFilePath: string;
  content: string;
}): ExtractedImport[] => {
  const sourceFile = ts.createSourceFile(
    input.sourceFilePath,
    input.content,
    ts.ScriptTarget.Latest,
    true,
    input.sourceFilePath.endsWith(".tsx") || input.sourceFilePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const imports: ExtractedImport[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && isStringLiteralSpecifier(node.moduleSpecifier)) {
      const kind = node.importClause?.isTypeOnly
        ? "type-import"
        : node.importClause
          ? "static-import"
          : "side-effect-import";
      pushImport({ imports, sourceFile, sourceFilePath: input.sourceFilePath, node, kind, specifier: node.moduleSpecifier.text });
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && isStringLiteralSpecifier(node.moduleSpecifier)) {
      pushImport({ imports, sourceFile, sourceFilePath: input.sourceFilePath, node, kind: "export-from", specifier: node.moduleSpecifier.text });
    }

    if (ts.isCallExpression(node)) {
      const requireSpecifier = extractRequireSpecifier(node);
      if (requireSpecifier) {
        pushImport({ imports, sourceFile, sourceFilePath: input.sourceFilePath, node, kind: "require", specifier: requireSpecifier });
      }

      const dynamicSpecifier = extractDynamicImportSpecifier(node);
      if (dynamicSpecifier) {
        pushImport({ imports, sourceFile, sourceFilePath: input.sourceFilePath, node, kind: "dynamic-import", specifier: dynamicSpecifier });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
};
  