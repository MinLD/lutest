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

const isPascalCase = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const lineOf = (sourceFile: ts.SourceFile, node: ts.Node): number =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const getStringArg = (node: ts.CallExpression): string | undefined => {
  const first = node.arguments[0];
  return first && ts.isStringLiteralLike(first) ? first.text : undefined;
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

  const visit = (node: ts.Node): void => {
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
      isPascalCase(node.name.text)
    ) {
      components.push({
        name: node.name.text,
        line: lineOf(sourceFile, node),
        kind: "const",
      });
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && expression.text === "fetch") {
        apis.push({
          name: "fetch",
          line: lineOf(sourceFile, node),
          kind: "fetch",
          target: getStringArg(node),
        });
      }
      if (ts.isPropertyAccessExpression(expression)) {
        const root = expression.expression.getText(sourceFile);
        const method = expression.name.text;
        if (root === "axios" || root === "ky") {
          apis.push({
            name: `${root}.${method}`,
            line: lineOf(sourceFile, node),
            kind: root as any,
            target: getStringArg(node),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  console.log(`Scanning ${filePath}: found ${apis.length} APIs`);
  return { components, apis };
};
