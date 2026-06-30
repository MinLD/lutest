import ts from "typescript";

export type DetectedDeclarationKind = "function" | "const" | "class";
export type DetectedApiKind = "fetch" | "axios" | "ky" | "ofetch" | "custom-client";

export type DetectedDeclarationSymbol = {
  name: string;
  line: number;
  column: number;
  kind: DetectedDeclarationKind;
};

export type DetectedApiSymbol = {
  kind: DetectedApiKind;
  target: string;
  method?: string;
  line: number;
  column: number;
  callee: string;
};

export type DetectedSymbols = {
  declarations: DetectedDeclarationSymbol[];
  apis: DetectedApiSymbol[];
};

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "request",
]);

const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);

const isFunctionLike = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node);

const getPosition = (sourceFile: ts.SourceFile, node: ts.Node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const getStringTarget = (node: ts.CallExpression): string | null => {
  const first = node.arguments[0];
  return first && ts.isStringLiteralLike(first) ? first.text : null;
};

const getApiKind = (
  expression: ts.LeftHandSideExpression,
  sourceFile: ts.SourceFile,
): DetectedApiKind | null => {
  if (ts.isIdentifier(expression)) {
    if (expression.text === "fetch") return "fetch";
    if (expression.text === "ofetch") return "ofetch";
    return null;
  }

  if (!ts.isPropertyAccessExpression(expression)) return null;

  const root = expression.expression.getText(sourceFile);
  const method = expression.name.text;

  if (root === "axios") return "axios";
  if (root === "ky") return "ky";
  if (root === "ofetch") return "ofetch";
  if (HTTP_METHODS.has(method)) return "custom-client";

  return null;
};

const getApiMethod = (
  expression: ts.LeftHandSideExpression,
): string | undefined => {
  if (!ts.isPropertyAccessExpression(expression)) return undefined;

  const method = expression.name.text;
  return HTTP_METHODS.has(method) ? method.toUpperCase() : undefined;
};

export const detectSymbols = (filePath: string, content: string): DetectedSymbols => {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );

  const declarations: DetectedDeclarationSymbol[] = [];
  const apis: DetectedApiSymbol[] = [];

  const pushDeclaration = (
    node: ts.Node,
    name: string,
    kind: DetectedDeclarationKind,
  ) => {
    if (!isPascalCase(name)) return;

    declarations.push({
      name,
      kind,
      ...getPosition(sourceFile, node),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      pushDeclaration(node, node.name.text, "function");
    }

    if (ts.isClassDeclaration(node) && node.name) {
      pushDeclaration(node, node.name.text, "class");
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isFunctionLike(node.initializer)
    ) {
      pushDeclaration(node, node.name.text, "const");
    }

    if (ts.isCallExpression(node)) {
      const kind = getApiKind(node.expression, sourceFile);
      const target = getStringTarget(node);

      if (kind && target) {
        apis.push({
          kind,
          target,
          method: getApiMethod(node.expression),
          callee: node.expression.getText(sourceFile),
          ...getPosition(sourceFile, node),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { declarations, apis };
};