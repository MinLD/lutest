import fs from "node:fs/promises";
import ts from "typescript";
import type { ProductionGraphEdge, ProductionGraphNode } from "@lutest/contracts";
import { extractTsJsImports } from "../import-resolver/extract-ts-js-imports";
import { resolveImportTarget } from "../import-resolver/resolve-import-target";
import { readTsconfigPathSettings } from "../import-resolver/tsconfig-paths";
import type { ExtractedImport, TsconfigPathSettings } from "../import-resolver/import-resolver.types";
import type { ClassifiedSourceSymbol } from "../source-extractors/source-extractor.types";
import type { ProductionProjectScanResult, ScannedProductionSourceFile } from "./production-project-scanner";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const fileNodeId = (filePath: string): string => `file:${normalizePath(filePath)}`;

const importEdgeId = (source: string, target: string): string =>
  `import:${source}->${target}`;

const renderEdgeId = (source: string, target: string): string =>
  `render:${source}->${target}`;

const fileNodeIds = (nodes: ProductionGraphNode[]): Set<string> =>
  new Set(nodes.filter((node) => node.kind === "file").map((node) => node.id));

const buildFileImportEdges = async (input: {
  file: ScannedProductionSourceFile;
  projectRoot: string;
  targetFileNodeIds: Set<string>;
  tsconfig: TsconfigPathSettings;
  content: string;
}): Promise<ProductionGraphEdge[]> => {
  const source = fileNodeId(input.file.relativePath);
  const imports = extractTsJsImports({
    sourceFilePath: input.file.relativePath,
    content: input.content,
  });
  const edges: ProductionGraphEdge[] = [];

  for (const item of imports) {
    const resolved = await resolveImportTarget({
      projectRoot: input.projectRoot,
      sourceFilePath: item.sourceFilePath,
      specifier: item.specifier,
      tsconfig: input.tsconfig,
    });
    if (!resolved.resolved || !resolved.targetFilePath) continue;

    const target = fileNodeId(resolved.targetFilePath);
    if (!input.targetFileNodeIds.has(target)) continue;

    edges.push({
      id: importEdgeId(source, target),
      kind: "import",
      source,
      target,
      confidence: resolved.confidence,
      reason: `${item.kind} ${item.specifier} resolved by ${resolved.reason}`,
    });
  }

  return edges;
};

type JsxUsage = {
  tagName: string;
  line: number;
};

const locFor = (sourceFile: ts.SourceFile, node: ts.Node): { line: number } => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1 };
};

const jsxTagName = (tagName: ts.JsxTagNameExpression): string | null => {
  if (ts.isIdentifier(tagName)) return /^[A-Z]/.test(tagName.text) ? tagName.text : null;
  if (ts.isPropertyAccessExpression(tagName)) {
    const left = tagName.expression.getText();
    const right = tagName.name.text;
    return /^[A-Z]/.test(left) && /^[A-Z]/.test(right) ? `${left}.${right}` : null;
  }
  return null;
};

const extractJsxUsages = (input: {
  sourceFilePath: string;
  content: string;
}): JsxUsage[] => {
  const sourceFile = ts.createSourceFile(
    input.sourceFilePath,
    input.content,
    ts.ScriptTarget.Latest,
    true,
    input.sourceFilePath.endsWith(".tsx") || input.sourceFilePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const usages: JsxUsage[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node)) {
      const tagName = jsxTagName(node.tagName);
      if (tagName) usages.push({ tagName, ...locFor(sourceFile, node) });
    }
    if (ts.isJsxOpeningElement(node)) {
      const tagName = jsxTagName(node.tagName);
      if (tagName) usages.push({ tagName, ...locFor(sourceFile, node) });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return usages;
};

type ImportBinding = {
  localName: string;
  importedName?: string;
  namespace?: boolean;
  targetFilePath: string;
};

const buildImportBindings = async (input: {
  projectRoot: string;
  file: ScannedProductionSourceFile;
  content: string;
  tsconfig: TsconfigPathSettings;
}): Promise<ImportBinding[]> => {
  const imports = extractTsJsImports({
    sourceFilePath: input.file.relativePath,
    content: input.content,
  });
  const bindings: ImportBinding[] = [];

  for (const item of imports) {
    const resolved = await resolveImportTarget({
      projectRoot: input.projectRoot,
      sourceFilePath: item.sourceFilePath,
      specifier: item.specifier,
      tsconfig: input.tsconfig,
    });
    if (!resolved.resolved || !resolved.targetFilePath) continue;
    bindings.push(...extractBindingsFromImport(item, input.content, resolved.targetFilePath));
  }

  return bindings;
};

const extractBindingsFromImport = (
  item: ExtractedImport,
  content: string,
  targetFilePath: string,
): ImportBinding[] => {
  const sourceFile = ts.createSourceFile(item.sourceFilePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bindings: ImportBinding[] = [];

  const addFromImportClause = (clause: ts.ImportClause): void => {
    if (clause.name) bindings.push({ localName: clause.name.text, targetFilePath });
    const named = clause.namedBindings;
    if (!named) return;
    if (ts.isNamespaceImport(named)) {
      bindings.push({ localName: named.name.text, namespace: true, targetFilePath });
      return;
    }
    for (const element of named.elements) {
      bindings.push({
        localName: element.name.text,
        importedName: (element.propertyName ?? element.name).text,
        targetFilePath,
      });
    }
  };

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== item.specifier) continue;
    if (statement.importClause) addFromImportClause(statement.importClause);
  }

  return bindings;
};

const renderSourceForLine = (
  symbols: ClassifiedSourceSymbol[],
  line: number,
): ClassifiedSourceSymbol | null => {
  const candidates = symbols
    .filter((symbol) =>
      (symbol.kind === "page" || symbol.kind === "component") &&
      symbol.loc.startLine <= line &&
      symbol.loc.endLine >= line,
    )
    .sort((left, right) =>
      (left.loc.endLine - left.loc.startLine) - (right.loc.endLine - right.loc.startLine),
    );
  return candidates[0] ?? null;
};

const callSourceForLine = (
  symbols: ClassifiedSourceSymbol[],
  line: number,
): ClassifiedSourceSymbol | null => {
  const sourceRank = (symbol: ClassifiedSourceSymbol): number => {
    if (symbol.kind === "page") return 0;
    if (symbol.kind === "component") return 1;
    if (symbol.kind === "hook") return 2;
    if (symbol.kind === "utility") return 3;
    return 4;
  };
  const candidates = symbols
    .filter((symbol) =>
      (symbol.kind === "page" ||
        symbol.kind === "component" ||
        symbol.kind === "hook" ||
        symbol.kind === "api-client-method" ||
        symbol.kind === "utility") &&
      symbol.loc.startLine <= line &&
      symbol.loc.endLine >= line,
    )
    .sort((left, right) =>
      (left.loc.endLine - left.loc.startLine) - (right.loc.endLine - right.loc.startLine) ||
      sourceRank(left) - sourceRank(right),
    );
  return candidates[0] ?? null;
};

const componentSymbolsByFile = (
  files: ScannedProductionSourceFile[],
): Map<string, ClassifiedSourceSymbol[]> => {
  const byFile = new Map<string, ClassifiedSourceSymbol[]>();
  for (const file of files) {
    byFile.set(file.relativePath, file.symbols.filter((symbol) => symbol.kind === "component"));
  }
  return byFile;
};

const uniqueGlobalComponent = (
  files: ScannedProductionSourceFile[],
  name: string,
): ClassifiedSourceSymbol | null => {
  const matches = files.flatMap((file) => file.symbols).filter((symbol) => symbol.kind === "component" && symbol.name === name);
  return matches.length === 1 ? matches[0] : null;
};

const resolveRenderTarget = (input: {
  tagName: string;
  file: ScannedProductionSourceFile;
  files: ScannedProductionSourceFile[];
  bindings: ImportBinding[];
  componentsByFile: Map<string, ClassifiedSourceSymbol[]>;
}): ClassifiedSourceSymbol | null => {
  const localComponents = input.componentsByFile.get(input.file.relativePath) ?? [];
  const local = localComponents.find((symbol) => symbol.name === input.tagName);
  if (local) return local;

  const [namespace, member] = input.tagName.split(".");
  if (namespace && member) {
    const binding = input.bindings.find((item) => item.namespace && item.localName === namespace);
    const components = binding ? input.componentsByFile.get(binding.targetFilePath) ?? [] : [];
    return components.find((symbol) => symbol.name === member) ?? null;
  }

  const binding = input.bindings.find((item) => item.localName === input.tagName);
  if (binding) {
    const components = input.componentsByFile.get(binding.targetFilePath) ?? [];
    return (
      components.find((symbol) => symbol.name === (binding.importedName ?? input.tagName)) ??
      components.find((symbol) => symbol.name === input.tagName) ??
      (components.length === 1 ? components[0] : null)
    );
  }

  return uniqueGlobalComponent(input.files, input.tagName);
};


type CallUsage = {
  callName: string;
  line: number;
};

const ignoredCallees = new Set([
  "console.log",
  "console.warn",
  "console.error",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "Promise.all",
  "Promise.race",
  "Promise.resolve",
  "Promise.reject",
  "fetch",
  "axios",
  "ky",
  "ofetch",
]);

const ignoredMemberNames = new Set(["map", "filter", "reduce", "forEach", "find", "some", "every"]);

const callExpressionName = (expression: ts.Expression): string | null => {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = expression.expression.getText();
    const right = expression.name.text;
    if (ignoredMemberNames.has(right)) return null;
    return `${left}.${right}`;
  }
  return null;
};

const isIgnoredCallName = (callName: string): boolean =>
  ignoredCallees.has(callName) || callName.startsWith("React.");

const extractCallUsages = (input: {
  sourceFilePath: string;
  content: string;
}): CallUsage[] => {
  const sourceFile = ts.createSourceFile(
    input.sourceFilePath,
    input.content,
    ts.ScriptTarget.Latest,
    true,
    input.sourceFilePath.endsWith(".tsx") || input.sourceFilePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const usages: CallUsage[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callName = callExpressionName(node.expression);
      if (callName && !isIgnoredCallName(callName)) {
        usages.push({ callName, ...locFor(sourceFile, node) });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return usages;
};

const extractLocalFunctionCallUsages = (input: {
  sourceFilePath: string;
  content: string;
}): Map<string, CallUsage[]> => {
  const sourceFile = ts.createSourceFile(
    input.sourceFilePath,
    input.content,
    ts.ScriptTarget.Latest,
    true,
    input.sourceFilePath.endsWith(".tsx") || input.sourceFilePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const usagesByFunction = new Map<string, CallUsage[]>();

  const collectCalls = (body: ts.Node): CallUsage[] => {
    const usages: CallUsage[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callName = callExpressionName(node.expression);
        if (callName && !isIgnoredCallName(callName)) {
          usages.push({ callName, ...locFor(sourceFile, node) });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return usages;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      usagesByFunction.set(node.name.text, collectCalls(node.body));
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return usagesByFunction;
};
const buildFileRenderEdges = async (input: {
  file: ScannedProductionSourceFile;
  files: ScannedProductionSourceFile[];
  projectRoot: string;
  tsconfig: TsconfigPathSettings;
  content: string;
  componentsByFile: Map<string, ClassifiedSourceSymbol[]>;
}): Promise<ProductionGraphEdge[]> => {
  const usages = extractJsxUsages({ sourceFilePath: input.file.relativePath, content: input.content });
  if (usages.length === 0) return [];
  const bindings = await buildImportBindings(input);
  const edges: ProductionGraphEdge[] = [];

  for (const usage of usages) {
    const source = renderSourceForLine(input.file.symbols, usage.line);
    if (!source) continue;
    const target = resolveRenderTarget({
      tagName: usage.tagName,
      file: input.file,
      files: input.files,
      bindings,
      componentsByFile: input.componentsByFile,
    });
    if (!target || target.id === source.id) continue;

    edges.push({
      id: renderEdgeId(source.id, target.id),
      kind: "render",
      source: source.id,
      target: target.id,
      confidence: "high",
      reason: `${source.name} renders <${usage.tagName}>`,
    });
  }

  return edges;
};


const callableSymbolsByFile = (
  files: ScannedProductionSourceFile[],
): Map<string, ClassifiedSourceSymbol[]> => {
  const byFile = new Map<string, ClassifiedSourceSymbol[]>();
  for (const file of files) {
    byFile.set(
      file.relativePath,
      file.symbols.filter((symbol) =>
        symbol.kind === "component" ||
        symbol.kind === "hook" ||
        symbol.kind === "api-client-method" ||
        symbol.kind === "utility",
      ),
    );
  }
  return byFile;
};

const uniqueGlobalCallable = (
  files: ScannedProductionSourceFile[],
  name: string,
): ClassifiedSourceSymbol | null => {
  const matches = files
    .flatMap((file) => file.symbols)
    .filter((symbol) =>
      (symbol.kind === "component" || symbol.kind === "hook" || symbol.kind === "api-client-method" || symbol.kind === "utility") &&
      symbol.name === name,
    );
  return matches.length === 1 ? matches[0] : null;
};

const resolveCallTarget = (input: {
  callName: string;
  file: ScannedProductionSourceFile;
  files: ScannedProductionSourceFile[];
  bindings: ImportBinding[];
  callablesByFile: Map<string, ClassifiedSourceSymbol[]>;
}): ClassifiedSourceSymbol | null => {
  const localCallables = input.callablesByFile.get(input.file.relativePath) ?? [];
  const local = localCallables.find((symbol) => symbol.name === input.callName);
  if (local) return local;

  const [namespace, member] = input.callName.split(".");
  if (namespace && member) {
    const binding = input.bindings.find((item) => item.localName === namespace);
    if (!binding) return null;

    const callables = input.callablesByFile.get(binding.targetFilePath) ?? [];
    if (binding.namespace) {
      return callables.find((symbol) => symbol.name === member) ?? null;
    }

    const importedObjectName = binding.importedName ?? binding.localName;
    const targetName = `${importedObjectName}.${member}`;
    const matches = callables.filter((symbol) => symbol.name === targetName);
    return matches.length === 1 ? matches[0] : null;
  }

  const binding = input.bindings.find((item) => item.localName === input.callName);
  if (binding) {
    const callables = input.callablesByFile.get(binding.targetFilePath) ?? [];
    return (
      callables.find((symbol) => symbol.name === (binding.importedName ?? input.callName)) ??
      callables.find((symbol) => symbol.name === input.callName) ??
      (callables.length === 1 ? callables[0] : null)
    );
  }

  return uniqueGlobalCallable(input.files, input.callName);
};

const buildFileCallEdges = async (input: {
  file: ScannedProductionSourceFile;
  files: ScannedProductionSourceFile[];
  projectRoot: string;
  tsconfig: TsconfigPathSettings;
  content: string;
  callablesByFile: Map<string, ClassifiedSourceSymbol[]>;
}): Promise<ProductionGraphEdge[]> => {
  const usages = extractCallUsages({ sourceFilePath: input.file.relativePath, content: input.content });
  if (usages.length === 0) return [];
  const localFunctionUsages = extractLocalFunctionCallUsages({ sourceFilePath: input.file.relativePath, content: input.content });
  const bindings = await buildImportBindings(input);
  const edges: ProductionGraphEdge[] = [];

  const pushResolvedEdge = (source: ClassifiedSourceSymbol, usage: CallUsage, via?: string): void => {
    const target = resolveCallTarget({
      callName: usage.callName,
      file: input.file,
      files: input.files,
      bindings,
      callablesByFile: input.callablesByFile,
    });
    if (!target || target.id === source.id) return;

    edges.push({
      id: `call:${source.id}->${target.id}`,
      kind: "call",
      source: source.id,
      target: target.id,
      confidence: "high",
      reason: via
        ? `${source.name} calls ${usage.callName}() via ${via}()`
        : `${source.name} calls ${usage.callName}()`,
    });
  };

  for (const usage of usages) {
    const source = callSourceForLine(input.file.symbols, usage.line);
    if (!source) continue;
    pushResolvedEdge(source, usage);

    if (!usage.callName.includes(".")) {
      for (const helperUsage of localFunctionUsages.get(usage.callName) ?? []) {
        pushResolvedEdge(source, helperUsage, usage.callName);
      }
    }
  }

  return edges;
};
export const buildProductionEdges = async (input: {
  scan: ProductionProjectScanResult;
  nodes: ProductionGraphNode[];
}): Promise<ProductionGraphEdge[]> => {
  const targetFileNodeIds = fileNodeIds(input.nodes);
  const tsconfig = await readTsconfigPathSettings(input.scan.rootDir);
  const componentsByFile = componentSymbolsByFile(input.scan.files);
  const callablesByFile = callableSymbolsByFile(input.scan.files);
  const contents = new Map<string, string>();
  const edges = new Map<string, ProductionGraphEdge>();

  for (const file of input.scan.files) {
    contents.set(file.relativePath, await fs.readFile(file.absolutePath, "utf-8"));
  }

  for (const file of input.scan.files) {
    const content = contents.get(file.relativePath) ?? "";
    const importEdges = await buildFileImportEdges({
      file,
      projectRoot: input.scan.rootDir,
      targetFileNodeIds,
      tsconfig,
      content,
    });
    const renderEdges = await buildFileRenderEdges({
      file,
      files: input.scan.files,
      projectRoot: input.scan.rootDir,
      tsconfig,
      content,
      componentsByFile,
    });
    const callEdges = await buildFileCallEdges({
      file,
      files: input.scan.files,
      projectRoot: input.scan.rootDir,
      tsconfig,
      content,
      callablesByFile,
    });
    for (const edge of [...importEdges, ...renderEdges, ...callEdges]) edges.set(edge.id, edge);
  }

  return Array.from(edges.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
};

export const buildProductionImportEdges = buildProductionEdges;
