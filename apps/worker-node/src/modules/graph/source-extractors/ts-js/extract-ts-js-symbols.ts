import ts from "typescript";
import type {
  DirectNetworkTarget,
  ExtractedSourceFile,
  RawSourceSymbol,
  RawSymbolKind,
  SourceFileKind,
} from "../source-extractor.types";
import { parseTsJsSourceFile, type ParsedTsJsSourceFile } from "./parse-ts-js-source-file";

const CLIENT_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "request",
]);

const REQUEST_HELPERS = new Set([
  "apiRequest",
  "request",
  "requestJson",
  "requestProductionGraph",
]);

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);

const isHookName = (name: string): boolean => /^use[A-Z0-9]/.test(name);

const isSupportedJsKind = (kind: SourceFileKind): boolean =>
  kind === "ts" || kind === "tsx" || kind === "js" || kind === "jsx";

const hasExportModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);

const hasDefaultModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false);

const getLoc = (sourceFile: ts.SourceFile, node: ts.Node) => {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1,
    endLine: end.line + 1,
  };
};

const rawSymbolId = (input: {
  rawKind: RawSymbolKind;
  filePath: string;
  name: string;
  loc: { startLine: number; endLine: number };
}): string =>
  `raw:${input.rawKind}:${normalizePath(input.filePath)}#${input.name}@${input.loc.startLine}-${input.loc.endLine}`;

const isNestedSymbolBoundary = (node: ts.Node): boolean =>
  ts.isFunctionDeclaration(node) ||
  ts.isClassDeclaration(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node);

const containsJsx = (node: ts.Node): boolean => {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child)
    ) {
      found = true;
      return;
    }
    if (child !== node && isNestedSymbolBoundary(child)) return;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
};

const staticHttpString = (node: ts.Expression | undefined): string | null => {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isCallExpression(node)) return staticHttpString(node.arguments[0]);
  return null;
};

const getCallTarget = (node: ts.CallExpression): string | null =>
  staticHttpString(node.arguments[0]);

const getRequestInitMethod = (node: ts.CallExpression): string | undefined => {
  const init = node.arguments[1];
  if (!init || !ts.isObjectLiteralExpression(init)) return undefined;
  const methodProperty = init.properties.find((property) =>
    ts.isPropertyAssignment(property) &&
    ((ts.isIdentifier(property.name) && property.name.text === "method") ||
      (ts.isStringLiteralLike(property.name) && property.name.text === "method")),
  );
  if (!methodProperty || !ts.isPropertyAssignment(methodProperty)) return undefined;
  return ts.isStringLiteralLike(methodProperty.initializer)
    ? methodProperty.initializer.text.toUpperCase()
    : undefined;
};

const isStaticHttpTarget = (target: string): boolean =>
  target.startsWith("/api") || target.startsWith("http://") || target.startsWith("https://");

const networkTarget = (input: {
  client: string;
  method?: string;
  target: string;
  line: number;
}): DirectNetworkTarget => ({
  client: input.client,
  ...(input.method ? { method: input.method } : {}),
  target: input.target,
  line: input.line,
});

const getNetworkTarget = (
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): DirectNetworkTarget | null => {
  const target = getCallTarget(node);
  if (!target) return null;
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const line = position.line + 1;
  const expression = node.expression;
  const methodOverride = getRequestInitMethod(node);

  if (ts.isIdentifier(expression)) {
    if (expression.text === "fetch") return networkTarget({ client: "fetch", method: methodOverride, target, line });
    if (expression.text === "ofetch") return networkTarget({ client: "ofetch", target, line });
    if (REQUEST_HELPERS.has(expression.text) && isStaticHttpTarget(target)) {
      return networkTarget({ client: expression.text, method: methodOverride ?? "GET", target, line });
    }
    return null;
  }

  if (!ts.isPropertyAccessExpression(expression)) return null;
  const root = expression.expression.getText(sourceFile);
  const method = expression.name.text;

  if (method === "request" && isStaticHttpTarget(target)) {
    return networkTarget({ client: `${root}.request`, method: methodOverride ?? "GET", target, line });
  }

  if (root === "axios" && CLIENT_METHODS.has(method)) {
    return networkTarget({ client: "axios", method: method.toUpperCase(), target, line });
  }
  if (root === "ky" && CLIENT_METHODS.has(method)) {
    return networkTarget({ client: "ky", method: method.toUpperCase(), target, line });
  }
  if (root === "ofetch" && CLIENT_METHODS.has(method)) {
    return networkTarget({ client: "ofetch", method: method.toUpperCase(), target, line });
  }

  return null;
};

const extractDirectNetworkTargets = (
  node: ts.Node,
  sourceFile: ts.SourceFile,
): DirectNetworkTarget[] => {
  const targets: DirectNetworkTarget[] = [];
  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child)) {
      const target = getNetworkTarget(child, sourceFile);
      if (target) targets.push(target);
    }
    if (child !== node && isNestedSymbolBoundary(child)) return;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return targets;
};

const getVariableFunctionInitializer = (
  node: ts.VariableDeclaration,
): { node: ts.ArrowFunction | ts.FunctionExpression; rawKind: RawSymbolKind } | null => {
  if (!node.initializer) return null;
  if (ts.isArrowFunction(node.initializer)) {
    return { node: node.initializer, rawKind: "arrow-function" };
  }
  if (ts.isFunctionExpression(node.initializer)) {
    return { node: node.initializer, rawKind: "function-expression" };
  }
  return null;
};

const getVariableStatement = (node: ts.VariableDeclaration): ts.VariableStatement | null => {
  const declarationList = node.parent;
  const statement = declarationList.parent;
  return ts.isVariableStatement(statement) ? statement : null;
};

const propertyName = (node: ts.PropertyName): string | null => {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
};

const objectMethodBody = (property: ts.MethodDeclaration | ts.PropertyAssignment): ts.Node | undefined => {
  if (ts.isMethodDeclaration(property)) return property.body;
  const initializer = property.initializer;
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer.body;
  return undefined;
};

const objectMethodRawKind = (property: ts.MethodDeclaration | ts.PropertyAssignment): RawSymbolKind => {
  if (ts.isMethodDeclaration(property)) return "method";
  if (ts.isArrowFunction(property.initializer)) return "arrow-function";
  if (ts.isFunctionExpression(property.initializer)) return "function-expression";
  return "method";
};

const isObjectFunctionMember = (
  property: ts.ObjectLiteralElementLike,
): property is ts.MethodDeclaration | ts.PropertyAssignment => {
  if (ts.isMethodDeclaration(property)) return true;
  return ts.isPropertyAssignment(property) &&
    (ts.isArrowFunction(property.initializer) || ts.isFunctionExpression(property.initializer));
};

const toRawSymbol = (input: {
  filePath: string;
  name: string;
  rawKind: RawSymbolKind;
  node: ts.Node;
  body?: ts.Node;
  exported: boolean;
  defaultExport: boolean;
  parsed: ParsedTsJsSourceFile;
}): RawSourceSymbol => {
  if (!input.parsed.sourceFile) {
    throw new Error("TS/JS parsed source file is missing SourceFile");
  }
  const scanNode = input.body ?? input.node;
  const directNetworkTargets = extractDirectNetworkTargets(scanNode, input.parsed.sourceFile);
  const loc = getLoc(input.parsed.sourceFile, input.node);
  return {
    id: rawSymbolId({
      rawKind: input.rawKind,
      filePath: input.filePath,
      name: input.name,
      loc,
    }),
    rawKind: input.rawKind,
    name: input.name,
    filePath: normalizePath(input.filePath),
    exported: input.exported,
    defaultExport: input.defaultExport,
    pascalCase: isPascalCase(input.name),
    hookName: isHookName(input.name),
    hasJsx: containsJsx(scanNode),
    hasDirectNetworkCall: directNetworkTargets.length > 0,
    directNetworkTargets,
    loc,
  };
};

export const extractRawSymbolsFromParsedSource = (
  parsed: ParsedTsJsSourceFile,
): RawSourceSymbol[] => {
  if (!parsed.sourceFile) return [];
  if (!isSupportedJsKind(parsed.kind)) return [];

  const symbols: RawSourceSymbol[] = [];
  const filePath = normalizePath(parsed.filePath);

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      const statement = getVariableStatement(node);
      const exported = statement ? hasExportModifier(statement) : false;
      if (exported) {
        for (const property of node.initializer.properties) {
          if (!isObjectFunctionMember(property)) continue;
          const name = propertyName(property.name);
          if (!name) continue;
          const qualifiedName = `${node.name.text}.${name}`;
          symbols.push(
            toRawSymbol({
              filePath,
              name: qualifiedName,
              rawKind: objectMethodRawKind(property),
              node: property,
              body: objectMethodBody(property),
              exported,
              defaultExport: false,
              parsed,
            }),
          );
        }
        return;
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push(
        toRawSymbol({
          filePath,
          name: node.name.text,
          rawKind: "function",
          node,
          body: node.body,
          exported: hasExportModifier(node),
          defaultExport: hasDefaultModifier(node),
          parsed,
        }),
      );
    }

    if (ts.isFunctionDeclaration(node) && !node.name && hasDefaultModifier(node)) {
      symbols.push(
        toRawSymbol({
          filePath,
          name: "default",
          rawKind: "function",
          node,
          body: node.body,
          exported: hasExportModifier(node),
          defaultExport: true,
          parsed,
        }),
      );
    }

    if (ts.isClassDeclaration(node) && node.name) {
      symbols.push(
        toRawSymbol({
          filePath,
          name: node.name.text,
          rawKind: "class",
          node,
          exported: hasExportModifier(node),
          defaultExport: hasDefaultModifier(node),
          parsed,
        }),
      );
    }

    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && !ts.isObjectLiteralExpression(node.parent)) {
      symbols.push(
        toRawSymbol({
          filePath,
          name: node.name.text,
          rawKind: "method",
          node,
          body: node.body,
          exported: hasExportModifier(node),
          defaultExport: false,
          parsed,
        }),
      );
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializer = getVariableFunctionInitializer(node);
      if (initializer) {
        const statement = getVariableStatement(node);
        symbols.push(
          toRawSymbol({
            filePath,
            name: node.name.text,
            rawKind: initializer.rawKind,
            node,
            body: initializer.node.body,
            exported: statement ? hasExportModifier(statement) : false,
            defaultExport: statement ? hasDefaultModifier(statement) : false,
            parsed,
          }),
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(parsed.sourceFile);
  return symbols;
};

export const parseAndExtractRawSymbols = (
  filePath: string,
  content: string,
): ExtractedSourceFile => {
  const parsed = parseTsJsSourceFile(filePath, content);
  return {
    filePath: normalizePath(filePath),
    kind: parsed.kind,
    language: "ts-js",
    symbols: extractRawSymbolsFromParsedSource(parsed),
    parseDiagnostics: parsed.parseDiagnostics,
  };
};




