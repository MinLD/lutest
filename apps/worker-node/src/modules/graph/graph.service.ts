import fs from "node:fs/promises";
import path from "node:path";
import type { GraphEdge, GraphNode, GraphResponse } from "@lutest/contracts";
import { fileSystemService } from "../../shared/services/file-system.service";
import { graphRepository } from "./graph.repository";
import { detectSymbols, type DetectedApiSymbol } from "./symbol-detector";
import { frameworkAdapterRegistry } from "./adapters/framework-adapter-registry";
import type { LegacyFrameworkAdapter } from "./adapters/legacy-framework-adapter";

export interface BuildAndSaveGraphInput {
  cwd: string;
  rootDir: string;
  projectPath?: string;
  envProjectPath?: string;
}

interface SourceFileForGraph {
  absolutePath: string;
  relativePath: string;
  content: string;
}

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const IGNORED_SOURCE_FILE_REGEX =
  /\.(d|test|spec|stories)\.(tsx|ts|jsx|js)$/;

const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|require\(["']([^"']+)["']\)/g;

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const isGraphSourceFile = (filePath: string): boolean =>
  !IGNORED_SOURCE_FILE_REGEX.test(path.basename(filePath));

const toNode = (
  rootDir: string,
  filePath: string,
  adapter: LegacyFrameworkAdapter,
): GraphNode => {
  const relativePath = normalizePath(path.relative(rootDir, filePath));

  let type: GraphNode["type"] = "file";
  if (adapter.isPage(relativePath)) type = "page";
  else if (adapter.isComponent(relativePath)) type = "component";
  else if (adapter.isApi(relativePath)) type = "api";

  return {
    id: `file:${relativePath}`,
    type,
    label: path.basename(filePath),
    filePath: relativePath,
  };
};

function toApiAwareNode(node: GraphNode, apis: DetectedApiSymbol[]): GraphNode {
  if (apis.length === 0) return node;

  return {
    ...node,
    type: node.type === "file" ? "api" : node.type,
    data: {
      ...node.data,
      apiCalls: apis.map((api) => ({
        kind: api.kind,
        target: api.target,
        method: api.method,
        line: api.line,
        column: api.column,
        callee: api.callee,
      })),
    },
  };
}

const readSourceFilesForGraph = async (
  rootDir: string,
  filePaths: string[],
): Promise<SourceFileForGraph[]> => {
  const files = await Promise.all(
    filePaths.map(async (absolutePath) => {
      const content = await fs.readFile(absolutePath, "utf-8");
      const relativePath = normalizePath(path.relative(rootDir, absolutePath));

      return {
        absolutePath,
        relativePath,
        content,
      };
    }),
  );

  return files;
};

const extractImportSpecifiers = (content: string): string[] => {
  const imports: string[] = [];
  let match: RegExpExecArray | null;

  IMPORT_REGEX.lastIndex = 0;

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const specifier = match[1] || match[2];
    if (specifier) imports.push(specifier);
  }

  return imports;
};

const resolveImportTarget = (input: {
  fromFilePath: string;
  specifier: string;
  nodeIds: Set<string>;
}): string | null => {
  if (!input.specifier.startsWith(".")) return null;

  const fromDir = path.dirname(input.fromFilePath);
  const rawTarget = normalizePath(path.join(fromDir, input.specifier));

  const candidates = [
    `file:${rawTarget}`,
    ...SOURCE_EXTENSIONS.map((ext) => `file:${rawTarget}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `file:${rawTarget}/index${ext}`),
  ];

  return candidates.find((candidate) => input.nodeIds.has(candidate)) ?? null;
};

const buildImportEdges = (input: {
  sourceFiles: SourceFileForGraph[];
  nodeIds: Set<string>;
}): GraphEdge[] => {
  const edges: GraphEdge[] = [];

  input.sourceFiles.forEach((file) => {
    const specifiers = extractImportSpecifiers(file.content);

    specifiers.forEach((specifier) => {
      const targetId = resolveImportTarget({
        fromFilePath: file.relativePath,
        specifier,
        nodeIds: input.nodeIds,
      });

      if (!targetId) return;

      edges.push({
        id: `import:file:${file.relativePath}->${targetId}`,
        type: "import",
        source: `file:${file.relativePath}`,
        target: targetId,
      });
    });
  });

  return edges;
};

const buildGraph = async (input: {
  rootDir: string;
}): Promise<GraphResponse> => {
  const sourceFilePaths = (
    await fileSystemService.listFiles({
      rootDir: input.rootDir,
      extensions: SOURCE_EXTENSIONS,
      ignoredDirs: ["node_modules", ".git", "dist", "build", ".next", ".lutest"],
    })
  ).filter(isGraphSourceFile);
  const sourceFiles = await readSourceFilesForGraph(
    input.rootDir,
    sourceFilePaths,
  );
  const adapter = await frameworkAdapterRegistry.getLegacyAdapterForProject(
    input.rootDir,
  );
  const filesWithSymbols = sourceFiles.map((file) => ({
    ...file,
    symbols: adapter.classifySymbols(
      file.relativePath,
      detectSymbols(file.relativePath, file.content),
    ),
  }));
  const nodes = filesWithSymbols.map((file) => {
    const baseNode = toNode(input.rootDir, file.absolutePath, adapter);
    return toApiAwareNode(baseNode, file.symbols.apis);
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeTotals = nodes.reduce(
    (total, node) => ({
      pageCount: total.pageCount + (node.type === "page" ? 1 : 0),
      componentCount:
        total.componentCount + (node.type === "component" ? 1 : 0),
      apiCount: total.apiCount + (node.type === "api" ? 1 : 0),
    }),
    { pageCount: 0, componentCount: 0, apiCount: 0 },
  );

  const edges = buildImportEdges({
    sourceFiles,
    nodeIds,
  });

  return {
    nodes,
    edges,
    summary: {
      ...nodeTotals,
      fileCount: nodes.length,
    },
  };
};

const buildAndSaveGraph = async (
  input: BuildAndSaveGraphInput,
): Promise<GraphResponse> => {
  const graph = await buildGraph({
    rootDir: input.rootDir,
  });

  await graphRepository.saveLatest({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
    graph,
  });

  return graph;
};

export const graphService = {
  buildGraph,
  buildAndSaveGraph,
};

