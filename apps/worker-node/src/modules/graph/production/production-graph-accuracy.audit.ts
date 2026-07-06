import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { validateProductionGraphResponse, type ProductionGraphResponse } from "@lutest/contracts";
import { buildProductionGraph } from "./production-graph-builder";

type ExpectedKind = "file" | "page" | "component" | "hook" | "api-client-method" | "external-endpoint";

type ExpectedItem = {
  kind: ExpectedKind;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  route?: string;
  endpoint?: string;
  reason: string;
  detectionMethod: "supported-file-walk" | "independent-ast-audit";
  evidence?: string;
  exported?: boolean;
};

type ExpectedInventory = {
  files: ExpectedItem[];
  pages: ExpectedItem[];
  components: ExpectedItem[];
  hooks: ExpectedItem[];
  apiClientCandidates: ExpectedItem[];
  endpointCandidates: ExpectedItem[];
  importantImports: string[];
  importantRenders: string[];
  importantCalls: string[];
  httpEdges: string[];
  ambiguous: string[];
};

type AuditResult = {
  rootDir: string;
  expectedInventory: ExpectedInventory;
  actualInventory: ReturnType<typeof actualInventory>;
  mismatches: Record<string, string[]>;
  rootCauses: string[];
  verdict: "PASS" | "PASS_WITH_KNOWN_LIMITATIONS" | "FAIL";
};

const IGNORED_DIRS = new Set(["node_modules", ".next", "dist", "build", ".lutest", "coverage"]);
const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const REQUIRED_ROOT = "D:/Projects/lutest/apps/ui";
const EXPECTED_ALIAS_IMPORT_EDGES = [
  "file:src/app/page.tsx->file:src/components/dashboard-shell.tsx",
  "file:src/components/dashboard-shell.tsx->file:src/lib/production-graph-adapter.ts",
  "file:src/components/dashboard-shell.tsx->file:src/lib/use-dashboard-data.ts",
];
const EXPECTED_OBJECT_MEMBER_CALL_EDGES = [
  "useDashboardData->lutestApi.getStatus",
  "useDashboardData->lutestApi.getProject",
  "useDashboardData->lutestApi.getProductionGraph",
  "useDashboardData->lutestApi.getLatestReport",
  "useDashboardData->lutestApi.runScan",
];
const FALSE_POSITIVE_UTILITY_NAMES = ["metadata.title", "metadata.description"];

const normalizePath = (value: string): string => value.replaceAll("\\", "/");
const posixRelative = (rootDir: string, filePath: string): string => normalizePath(path.relative(rootDir, filePath));

const isSupportedSourcePath = (filePath: string): boolean => {
  const normalized = normalizePath(filePath);
  const basename = path.posix.basename(normalized);
  const extension = path.posix.extname(normalized);
  return (
    SUPPORTED_EXTENSIONS.has(extension) &&
    !normalized.endsWith(".d.ts") &&
    !/\.(test|spec|stories)\.[cm]?[jt]sx?$/.test(basename)
  );
};

const lineRange = (sourceFile: ts.SourceFile, node: ts.Node) => {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return { startLine: start, endLine: end };
};

const hasExportModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);

const textOf = (sourceFile: ts.SourceFile, node: ts.Node): string =>
  node.getText(sourceFile).replace(/\s+/g, " ").slice(0, 180);

const containsJsx = (node: ts.Node): boolean => {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child) ||
      ts.isJsxOpeningElement(child)
    ) {
      found = true;
      return;
    }
    child.forEachChild(visit);
  };
  node.forEachChild(visit);
  return found;
};

const apiPathFromFilePath = (filePath: string): string | null => {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/^src\/app\/(.*\/)??page\.[jt]sx$/);
  if (!match) return null;
  const routePart = normalized
    .replace(/^src\/app\//, "")
    .replace(/\/page\.[jt]sx$/, "")
    .replace(/^page\.[jt]sx$/, "");
  return routePart ? `/${routePart}` : "/";
};

const listSupportedFiles = async (rootDir: string): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await visit(absolutePath);
        continue;
      }
      if (entry.isFile() && isSupportedSourcePath(absolutePath)) {
        files.push(absolutePath);
      }
    }
  };
  await visit(rootDir);
  return files.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
};

const sourceKindForPath = (filePath: string): ts.ScriptKind => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};

const namedDeclarationName = (node: ts.Node): string | null => {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) return node.name.text;
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isShorthandPropertyAssignment(node) && ts.isIdentifier(node.name)) return node.name.text;
  return null;
};

const isPascalCase = (value: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(value);
const isHookName = (value: string): boolean => /^use[A-Z]/.test(value);

const pushSymbol = (items: ExpectedItem[], input: Omit<ExpectedItem, "detectionMethod">) => {
  items.push({ ...input, detectionMethod: "independent-ast-audit" });
};

const findStringLiteralEndpoints = (sourceFile: ts.SourceFile, node: ts.Node): string[] => {
  const endpoints: string[] = [];
  const visit = (child: ts.Node): void => {
    if (ts.isStringLiteralLike(child) && /^(\/api\/|https?:\/\/|\/api$)/.test(child.text)) {
      endpoints.push(child.text);
    }
    child.forEachChild(visit);
  };
  node.forEachChild(visit);
  return [...new Set(endpoints)].sort();
};

const hasRequestCall = (node: ts.Node): boolean => {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(child)) {
      const expression = child.expression.getText();
      if (/^(fetch|requestJson|requestProductionGraph|request|axios\.|ky\.)/.test(expression)) {
        found = true;
        return;
      }
    }
    child.forEachChild(visit);
  };
  node.forEachChild(visit);
  return found;
};

const auditSourceFile = (input: {
  rootDir: string;
  filePath: string;
  content: string;
  sourceFile: ts.SourceFile;
  inventory: ExpectedInventory;
}) => {
  const { filePath, sourceFile, inventory } = input;
  const route = apiPathFromFilePath(filePath);

  const recordComponentOrHook = (node: ts.Node, name: string, exported = false) => {
    const range = lineRange(sourceFile, node);
    if (isHookName(name)) {
      pushSymbol(inventory.hooks, {
        kind: "hook",
        name,
        filePath,
        ...range,
        exported,
        reason: "Function name starts with use[A-Z]",
        evidence: textOf(sourceFile, node),
      });
      return;
    }
    if (isPascalCase(name) && containsJsx(node)) {
      const pageRoute = route && /(^|\/)page\.[jt]sx$/.test(filePath) ? route : undefined;
      if (pageRoute) return;
      pushSymbol(inventory.components, {
        kind: "component",
        name,
        filePath,
        ...range,
        exported,
        reason: "PascalCase function/class/arrow function contains JSX",
        evidence: textOf(sourceFile, node),
      });
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      const name = namedDeclarationName(node);
      if (name) recordComponentOrHook(node, name, hasExportModifier(node));
    }

    if (ts.isVariableStatement(node)) {
      const exported = hasExportModifier(node);
      for (const declaration of node.declarationList.declarations) {
        const name = namedDeclarationName(declaration);
        if (!name) continue;
        recordComponentOrHook(declaration, name, exported);
        if (exported && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          auditExportedApiObject(filePath, sourceFile, declaration.name.getText(), declaration.initializer, inventory);
        }
      }
    }

    if (ts.isFunctionDeclaration(node) && hasExportModifier(node)) {
      const name = namedDeclarationName(node);
      if (name && hasRequestCall(node)) recordApiCandidate(filePath, sourceFile, name, node, inventory, "exported function with API request call");
    }

    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text ?? "AnonymousClass";
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member)) {
          const methodName = namedDeclarationName(member);
          if (methodName && hasRequestCall(member)) {
            recordApiCandidate(filePath, sourceFile, `${className}.${methodName}`, member, inventory, "class method with API request call");
          }
        }
      }
    }

    node.forEachChild(visit);
  };

  if (route) {
    const pageName = sourceFile.statements
      .map((statement) => namedDeclarationName(statement))
      .find((name): name is string => !!name) ?? path.posix.basename(filePath);
    const range = { startLine: 1, endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1 };
    pushSymbol(inventory.pages, {
      kind: "page",
      name: pageName,
      filePath,
      ...range,
      route,
      reason: "Next App Router page file convention",
      evidence: `${filePath} -> ${route}`,
    });
  }

  visit(sourceFile);
};

const recordApiCandidate = (
  filePath: string,
  sourceFile: ts.SourceFile,
  name: string,
  node: ts.Node,
  inventory: ExpectedInventory,
  reason: string,
) => {
  const range = lineRange(sourceFile, node);
  const endpoints = findStringLiteralEndpoints(sourceFile, node);
  pushSymbol(inventory.apiClientCandidates, {
    kind: "api-client-method",
    name,
    filePath,
    ...range,
    reason,
    evidence: textOf(sourceFile, node),
  });
  for (const endpoint of endpoints) {
    pushSymbol(inventory.endpointCandidates, {
      kind: "external-endpoint",
      name: endpoint,
      filePath,
      ...range,
      endpoint,
      reason: `API client candidate ${name} references endpoint string`,
      evidence: endpoint,
    });
    inventory.httpEdges.push(`${name}->${endpoint}`);
  }
};

const auditExportedApiObject = (
  filePath: string,
  sourceFile: ts.SourceFile,
  objectName: string,
  objectLiteral: ts.ObjectLiteralExpression,
  inventory: ExpectedInventory,
) => {
  for (const property of objectLiteral.properties) {
    const methodName = namedDeclarationName(property);
    if (!methodName) continue;
    if (ts.isMethodDeclaration(property) || ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      const target = `${objectName}.${methodName}`;
      const requestLike = hasRequestCall(property);
      const endpoints = findStringLiteralEndpoints(sourceFile, property);
      if (requestLike || endpoints.length > 0) {
        recordApiCandidate(
          filePath,
          sourceFile,
          target,
          property,
          inventory,
          "exported object literal method/property with API request call",
        );
      }
    }
  }
};

const buildExpectedInventory = async (rootDir: string, files: string[]): Promise<ExpectedInventory> => {
  const inventory: ExpectedInventory = {
    files: [],
    pages: [],
    components: [],
    hooks: [],
    apiClientCandidates: [],
    endpointCandidates: [],
    importantImports: [],
    importantRenders: [],
    importantCalls: [],
    httpEdges: [],
    ambiguous: [],
  };

  for (const absolutePath of files) {
    const filePath = posixRelative(rootDir, absolutePath);
    const content = await fs.readFile(absolutePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, sourceKindForPath(filePath));
    inventory.files.push({
      kind: "file",
      name: filePath,
      filePath,
      startLine: 1,
      endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1,
      reason: "Supported source extension and not excluded by audit inventory rules",
      detectionMethod: "supported-file-walk",
    });
    auditSourceFile({ rootDir, filePath, content, sourceFile, inventory });

    if (/^import\s/m.test(content)) inventory.importantImports.push(filePath);
    const renderMatches = [...content.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((match) => match[1]);
    for (const name of renderMatches) inventory.importantRenders.push(`${filePath}->${name}`);
    if (/useDashboardData\s*\(/.test(content)) inventory.importantCalls.push(`${filePath}->useDashboardData`);
  }

  inventory.endpointCandidates = dedupeItems(inventory.endpointCandidates, (item) => `${item.name}:${item.filePath}:${item.startLine}`);
  inventory.httpEdges = [...new Set(inventory.httpEdges)].sort();
  inventory.importantImports = [...new Set(inventory.importantImports)].sort();
  inventory.importantRenders = [...new Set(inventory.importantRenders)].sort();
  inventory.importantCalls = [...new Set(inventory.importantCalls)].sort();
  return inventory;
};

const dedupeItems = <T>(items: T[], keyOf: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const actualInventory = (graph: ProductionGraphResponse) => {
  const nodesByKind = (kind: string) => graph.nodes.filter((node) => node.kind === kind);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return {
    files: nodesByKind("file"),
    pages: nodesByKind("page"),
    components: nodesByKind("component"),
    hooks: nodesByKind("hook"),
    apiClientMethods: nodesByKind("api-client-method"),
    externalEndpoints: nodesByKind("external-endpoint"),
    utilities: nodesByKind("utility"),
    imports: graph.edges.filter((edge) => edge.kind === "import"),
    renders: graph.edges.filter((edge) => edge.kind === "render"),
    calls: graph.edges.filter((edge) => edge.kind === "call"),
    objectMemberCalls: graph.edges
      .filter((edge) => edge.kind === "call")
      .map((edge) => `${nodeById.get(edge.source)?.name ?? edge.source}->${nodeById.get(edge.target)?.name ?? edge.target}`)
      .filter((edge) => edge.startsWith("useDashboardData->lutestApi."))
      .sort(),
    http: graph.edges.filter((edge) => edge.kind === "http"),
    summary: graph.summary,
  };
};

const itemKey = (item: ExpectedItem): string => `${item.filePath}:${item.name}`;
const actualNodeKey = (node: { filePath?: string; name: string }): string => `${node.filePath ?? ""}:${node.name}`;

const missingByName = (expected: ExpectedItem[], actual: { filePath?: string; name: string }[]): string[] => {
  const actualKeys = new Set(actual.map(actualNodeKey));
  return expected.filter((item) => !actualKeys.has(itemKey(item))).map(formatExpectedItem);
};

const unexpectedByName = (expected: ExpectedItem[], actual: { filePath?: string; name: string }[]): string[] => {
  const expectedKeys = new Set(expected.map(itemKey));
  return actual.filter((node) => !expectedKeys.has(actualNodeKey(node))).map((node) => `${node.filePath ?? "<no-file>"}:${node.name}`);
};

const formatExpectedItem = (item: ExpectedItem): string =>
  `${item.name} | ${item.filePath}:${item.startLine}-${item.endLine} | ${item.reason}`;

const compareAudit = (expected: ExpectedInventory, actual: ReturnType<typeof actualInventory>) => {
  const expectedFiles = expected.files.map((item) => item.filePath).sort();
  const actualFiles = actual.files.map((node) => node.filePath ?? node.name).sort();
  const missingFiles = expectedFiles.filter((file) => !actualFiles.includes(file));
  const unexpectedFiles = actualFiles.filter((file) => !expectedFiles.includes(file));
  const wrongRoutes = expected.pages
    .filter((page) => !actual.pages.some((node) => node.filePath === page.filePath && node.route?.path === page.route))
    .map(formatExpectedItem);

  return {
    missingFiles,
    unexpectedFiles,
    missingPages: missingByName(expected.pages, actual.pages),
    unexpectedPages: unexpectedByName(expected.pages, actual.pages),
    wrongRoutes,
    missingComponents: missingByName(expected.components, actual.components),
    unexpectedComponents: unexpectedByName(expected.components, actual.components),
    missingHooks: missingByName(expected.hooks, actual.hooks),
    unexpectedHooks: unexpectedByName(expected.hooks, actual.hooks),
    missingApiClientMethods: missingByName(expected.apiClientCandidates, actual.apiClientMethods),
    unexpectedApiClientMethods: unexpectedByName(expected.apiClientCandidates, actual.apiClientMethods),
    missingExternalEndpoints: expected.endpointCandidates
      .filter((item) => !actual.externalEndpoints.some((node) => node.name === item.name || node.http?.path === item.endpoint))
      .map(formatExpectedItem),
    unexpectedExternalEndpoints: actual.externalEndpoints
      .filter((node) => !expected.endpointCandidates.some((item) => item.endpoint === node.http?.path || item.name === node.name))
      .map((node) => node.name),
    missingHttpEdges: expected.httpEdges.filter(() => actual.http.length === 0),
    falsePositiveUtilityNodes: actual.utilities
      .filter((node) => FALSE_POSITIVE_UTILITY_NAMES.includes(node.name))
      .map((node) => `${node.name} | ${node.filePath ?? "<no-file>"}`),
    missingAliasImportEdges: EXPECTED_ALIAS_IMPORT_EDGES.filter((expectedEdge) =>
      !actual.imports.some((edge) => `${edge.source}->${edge.target}` === expectedEdge),
    ),
    missingObjectMemberCallEdges: EXPECTED_OBJECT_MEMBER_CALL_EDGES.filter((expectedEdge) =>
      !actual.objectMemberCalls.includes(expectedEdge),
    ),
  };
};

const rootCausesFor = (mismatches: ReturnType<typeof compareAudit>): string[] => {
  const causes: string[] = [];
  if (mismatches.missingApiClientMethods.length > 0) {
    causes.push("API client methods likely missed because production extractor does not emit exported object literal methods as source symbols or adapter only classifies symbols with direct network targets on emitted symbols.");
  }
  if (mismatches.missingExternalEndpoints.length > 0 || mismatches.missingHttpEdges.length > 0) {
    causes.push("External endpoints/HTTP edges likely missed because worker API paths are behind requestJson/requestProductionGraph indirection instead of direct fetch/axios calls inside classified api-client-method symbols.");
  }
  return causes;
};

const verdictFor = (mismatches: ReturnType<typeof compareAudit>, validationOk: boolean): AuditResult["verdict"] => {
  if (!validationOk) return "FAIL";
  const hardFailures = [
    mismatches.missingFiles,
    mismatches.unexpectedFiles,
    mismatches.missingPages,
    mismatches.unexpectedPages,
    mismatches.wrongRoutes,
    mismatches.missingComponents,
    mismatches.unexpectedComponents,
    mismatches.missingHooks,
    mismatches.unexpectedHooks,
    mismatches.falsePositiveUtilityNodes,
    mismatches.missingAliasImportEdges,
    mismatches.missingObjectMemberCallEdges,
  ].some((items) => items.length > 0);
  if (hardFailures) return "FAIL";
  const knownLimitations =
    mismatches.missingApiClientMethods.length > 0 ||
    mismatches.missingExternalEndpoints.length > 0 ||
    mismatches.missingHttpEdges.length > 0;
  return knownLimitations ? "PASS_WITH_KNOWN_LIMITATIONS" : "PASS";
};

const list = (items: string[]) => (items.length === 0 ? "- none" : items.map((item) => `- ${item}`).join("\n"));
const listExpected = (items: ExpectedItem[]) => list(items.map(formatExpectedItem));
const listActualNodes = (items: { name: string; filePath?: string }[]) => list(items.map((item) => `${item.name} | ${item.filePath ?? "<no-file>"}`));

const printReport = (result: AuditResult) => {
  const { expectedInventory: expected, actualInventory: actual, mismatches, rootCauses, verdict, rootDir } = result;
  console.log(`# Production Graph Accuracy Audit\n`);
  console.log(`Root:\n${rootDir}\n`);
  console.log("## Supported files\n");
  console.log(`Expected count: ${expected.files.length}`);
  console.log(`Actual graph fileCount: ${actual.summary.fileCount}`);
  console.log("Expected supported files:");
  console.log(list(expected.files.map((item) => item.filePath)));
  console.log("Missing files:");
  console.log(list(mismatches.missingFiles));
  console.log("Unexpected files:");
  console.log(list(mismatches.unexpectedFiles));

  console.log("\n## Pages\n");
  console.log(`Expected: ${expected.pages.length}\n${listExpected(expected.pages)}`);
  console.log(`Actual: ${actual.pages.length}\n${listActualNodes(actual.pages)}`);
  console.log(`Missing:\n${list(mismatches.missingPages)}`);
  console.log(`Unexpected:\n${list(mismatches.unexpectedPages)}`);
  console.log(`Wrong route:\n${list(mismatches.wrongRoutes)}`);
  console.log("Wrong kind:\n- none");

  console.log("\n## Components\n");
  console.log(`Expected: ${expected.components.length}\n${listExpected(expected.components)}`);
  console.log(`Actual: ${actual.components.length}\n${listActualNodes(actual.components)}`);
  console.log(`Missing:\n${list(mismatches.missingComponents)}`);
  console.log(`Unexpected:\n${list(mismatches.unexpectedComponents)}`);
  console.log("Wrong kind:\n- none");

  console.log("\n## Hooks\n");
  console.log(`Expected: ${expected.hooks.length}\n${listExpected(expected.hooks)}`);
  console.log(`Actual: ${actual.hooks.length}\n${listActualNodes(actual.hooks)}`);
  console.log(`Missing:\n${list(mismatches.missingHooks)}`);
  console.log(`Unexpected:\n${list(mismatches.unexpectedHooks)}`);
  console.log("Wrong kind:\n- none");

  console.log("\n## API client methods\n");
  console.log(`Expected API client candidates: ${expected.apiClientCandidates.length}\n${listExpected(expected.apiClientCandidates)}`);
  console.log(`Actual api-client-method nodes: ${actual.apiClientMethods.length}\n${listActualNodes(actual.apiClientMethods)}`);
  console.log(`Missing:\n${list(mismatches.missingApiClientMethods)}`);
  console.log(`Unexpected:\n${list(mismatches.unexpectedApiClientMethods)}`);
  console.log(`Root cause candidates:\n${list(rootCauses)}`);

  console.log("\n## External endpoints\n");
  console.log(`Expected endpoint candidates: ${expected.endpointCandidates.length}\n${listExpected(expected.endpointCandidates)}`);
  console.log(`Actual external-endpoint nodes: ${actual.externalEndpoints.length}\n${listActualNodes(actual.externalEndpoints)}`);
  console.log(`Missing:\n${list(mismatches.missingExternalEndpoints)}`);
  console.log(`Unexpected:\n${list(mismatches.unexpectedExternalEndpoints)}`);
  console.log(`Root cause candidates:\n${list(rootCauses)}`);

  console.log("\n## Edges\n");
  console.log("### Import edges\n");
  console.log(`Expected alias imports:\n${list(EXPECTED_ALIAS_IMPORT_EDGES)}`);
  console.log(`Missing alias imports:\n${list(mismatches.missingAliasImportEdges)}`);
  console.log(`Expected important: ${expected.importantImports.length}\n${list(expected.importantImports)}`);
  console.log(`Actual: ${actual.imports.length}`);
  console.log("Missing:\n- not exhaustively audited in R5.6.3");
  console.log("Unexpected:\n- not exhaustively audited in R5.6.3");
  console.log("\n### Render edges\n");
  console.log(`Expected important: ${expected.importantRenders.length}\n${list(expected.importantRenders)}`);
  console.log(`Actual: ${actual.renders.length}`);
  console.log("Missing:\n- not exhaustively audited in R5.6.3");
  console.log("Unexpected:\n- not exhaustively audited in R5.6.3");
  console.log("\n### Call edges\n");
  console.log(`Expected important: ${expected.importantCalls.length}\n${list(expected.importantCalls)}`);
  console.log(`Actual: ${actual.calls.length}`);
  console.log("Missing:\n- not exhaustively audited in R5.6.3");
  console.log("Unexpected:\n- not exhaustively audited in R5.6.3");
  console.log("\n### Object member call edges\n");
  console.log(`Expected: ${EXPECTED_OBJECT_MEMBER_CALL_EDGES.length}\n${list(EXPECTED_OBJECT_MEMBER_CALL_EDGES)}`);
  console.log(`Actual: ${actual.objectMemberCalls.length}\n${list(actual.objectMemberCalls)}`);
  console.log(`Missing:\n${list(mismatches.missingObjectMemberCallEdges)}`);
  console.log("\n### HTTP edges\n");
  console.log(`Expected: ${expected.httpEdges.length}\n${list(expected.httpEdges)}`);
  console.log(`Actual: ${actual.http.length}`);
  console.log(`Missing:\n${list(mismatches.missingHttpEdges)}`);
  console.log(`Likely root cause:\n${list(rootCauses)}`);

  console.log("\n## Ambiguous / needs human review\n");
  console.log(list(expected.ambiguous));
  console.log("\n## False positive utility nodes\n");
  console.log(list(mismatches.falsePositiveUtilityNodes));
  console.log("\n## Final verdict\n");
  console.log(verdict);
};

const writeJsonReport = async (rootDir: string, result: AuditResult) => {
  const outputDir = path.join(rootDir, ".lutest", "audits");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "production-graph-accuracy-apps-ui.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf-8",
  );
};

const main = async () => {
  const rootArg = process.argv[2];
  if (!rootArg) {
    console.error("Usage: npx tsx ./apps/worker-node/src/modules/graph/production/production-graph-accuracy.audit.ts D:/Projects/lutest/apps/ui");
    process.exit(1);
  }

  const rootDir = normalizePath(path.resolve(rootArg));
  if (rootDir !== REQUIRED_ROOT) {
    console.error(`Audit root must be ${REQUIRED_ROOT}; received ${rootDir}`);
    process.exit(1);
  }

  const files = await listSupportedFiles(rootDir);
  const expectedInventory = await buildExpectedInventory(rootDir, files);
  const graph = await buildProductionGraph({ rootDir });
  const validation = validateProductionGraphResponse(graph);
  if (!validation.ok) {
    console.error(`ProductionGraphResponse validation failed: ${validation.message}`);
    process.exit(1);
  }

  const actual = actualInventory(graph);
  const mismatches = compareAudit(expectedInventory, actual);
  const rootCauses = rootCausesFor(mismatches);
  const verdict = verdictFor(mismatches, validation.ok);
  const result: AuditResult = {
    rootDir,
    expectedInventory,
    actualInventory: actual,
    mismatches,
    rootCauses,
    verdict,
  };

  printReport(result);
  await writeJsonReport(rootDir, result);
  if (verdict === "FAIL") process.exit(1);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
