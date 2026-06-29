import ts from "typescript";

export type DetectedComponentSymbol = {
  name: string;
  line: number;
  kind: "function" | "const" | "class";
};

export type DetectedApiSymbol = {
  name: string;
  line: number;
  kind: "fetch" | "axios" | "ky" | "ofetch" | "custom-client";
  target?: string;
};

export type DetectedPageSymbol = {
  name: string;
  line: number;
  kind: "default-export" | "file";
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "request"]);

const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const isFunctionLike = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node);

const isPageFile = (filePath: string): boolean =>
  /(?:^|[\\/])app[\\/].*[\\/]page\.(tsx|ts|jsx|js)$/.test(filePath) ||
  /(?:^|[\\/])pages[\\/].+\.(tsx|ts|jsx|js)$/.test(filePath);

const lineOf = (sourceFile: ts.SourceFile, node: ts.Node): number =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const getStringArg = (node: ts.CallExpression): string | undefined => {
  const first = node.arguments[0];
  return first && ts.isStringLiteralLike(first) ? first.text : undefined;
};

const hasDefaultModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  ts
    .getModifiers(node)
    ?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) === true;

const getApiKind = (
  expression: ts.LeftHandSideExpression,
  sourceFile: ts.SourceFile,
): DetectedApiSymbol["kind"] | null => {
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

export const detectSymbols = (filePath: string, content: string) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );

  const components: DetectedComponentSymbol[] = [];
  const apis: DetectedApiSymbol[] = [];
  const pages: DetectedPageSymbol[] = [];

  const visit = (node: ts.Node): void => {
    if (
      isPageFile(filePath) &&
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      hasDefaultModifier(node)
    ) {
      pages.push({
        name: node.name?.text ?? "default",
        line: lineOf(sourceFile, node),
        kind: "default-export",
      });
    }

    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      isPascalCase(node.name.text)
    ) {
      components.push({
        name: node.name.text,
        line: lineOf(sourceFile, node),
        kind: "function",
      });
    }

    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      isPascalCase(node.name.text)
    ) {
      components.push({
        name: node.name.text,
        line: lineOf(sourceFile, node),
        kind: "class",
      });
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isPascalCase(node.name.text) &&
      isFunctionLike(node.initializer)
    ) {
      components.push({
        name: node.name.text,
        line: lineOf(sourceFile, node),
        kind: "const",
      });
    }

    if (ts.isCallExpression(node)) {
      const kind = getApiKind(node.expression, sourceFile);
      if (kind) {
        apis.push({
          name: node.expression.getText(sourceFile),
          line: lineOf(sourceFile, node),
          kind,
          target: getStringArg(node),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (isPageFile(filePath) && pages.length === 0) {
    pages.push({
      name: "page",
      line: 1,
      kind: "file",
    });
  }

  return { components, apis, pages };
};