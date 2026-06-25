import fs from "node:fs/promises";
import path from "node:path";
import type { GraphEdge, GraphNode, GraphResponse } from "@lutest/contracts";
import { fileSystemService } from "../../shared/services/file-system.service";
import { graphRepository } from "./graph.repository";
import { detectApiCalls } from "./api-call-detector";
import type { ApiCallInfo } from "@lutest/contracts";
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

const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|require\(["']([^"']+)["']\)/g;

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const getPathSegments = (relativePath: string): string[] => {
  return normalizePath(relativePath).split("/");
};

const getFileName = (relativePath: string): string => {
  return path.basename(relativePath);
};

const getFileStem = (relativePath: string): string => {
  return path.basename(relativePath, path.extname(relativePath));
};

const hasSegment = (relativePath: string, segments: string[]): boolean => {
  const pathSegments = getPathSegments(relativePath);
  return segments.some((segment) => pathSegments.includes(segment));
};

const isNextAppPageFile = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  return (
    hasSegment(relativePath, ["app"]) &&
    ["page.tsx", "page.ts", "page.jsx", "page.js"].includes(fileName)
  );
};

const isNextPagesRouterPageFile = (relativePath: string): boolean => {
  if (!hasSegment(relativePath, ["pages"])) return false;
  if (hasSegment(relativePath, ["api"])) return false;

  const fileName = getFileName(relativePath);
  if (fileName.startsWith("_")) return false;

  return /\.(tsx|ts|jsx|js)$/.test(fileName);
};

const isRouteFile = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  return (
    hasSegment(relativePath, ["routes"]) && /\.(tsx|ts|jsx|js)$/.test(fileName)
  );
};

const isPageFile = (relativePath: string): boolean => {
  return (
    isNextAppPageFile(relativePath) ||
    isNextPagesRouterPageFile(relativePath) ||
    isRouteFile(relativePath)
  );
};

const isApiFile = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);

  if (
    hasSegment(relativePath, ["app"]) &&
    ["route.ts", "route.tsx", "route.js", "route.jsx"].includes(fileName)
  ) {
    return true;
  }

  if (
    hasSegment(relativePath, ["pages"]) &&
    hasSegment(relativePath, ["api"])
  ) {
    return true;
  }

  return hasSegment(relativePath, ["api", "server", "services"]);
};

const isComponentFile = (relativePath: string): boolean => {
  const fileName = getFileName(relativePath);
  const stem = getFileStem(relativePath);

  if (!/\.(tsx|jsx)$/.test(fileName)) return false;

  if (hasSegment(relativePath, ["components", "ui"])) return true;

  return /^[A-Z]/.test(stem);
};

const toNode = (rootDir: string, filePath: string): GraphNode => {
  const relativePath = normalizePath(path.relative(rootDir, filePath));

  let type: GraphNode["type"] = "file";
  if (isPageFile(relativePath)) type = "page";
  else if (isComponentFile(relativePath)) type = "component";
  else if (isApiFile(relativePath)) type = "api";

  return {
    id: `file:${relativePath}`,
    type,
    label: path.basename(filePath),
    filePath: relativePath,
  };
};

function toApiAwareNode(node: GraphNode, source: string): GraphNode {
  const apiCalls = detectApiCalls(source);

  if (apiCalls.length === 0) return node;

  return {
    ...node,
    type: node.type === "file" ? "api" : node.type,
    data: {
      ...node.data,
      apiCalls,
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
  const sourceFilePaths = await fileSystemService.listFiles({
    rootDir: input.rootDir,
    extensions: SOURCE_EXTENSIONS,
    ignoredDirs: ["node_modules", ".git", "dist", "build", ".next", ".lutest"],
  });
  const sourceFiles = await readSourceFilesForGraph(
    input.rootDir,
    sourceFilePaths,
  );
  const nodes = sourceFiles.map((file) => {
    const baseNode = toNode(input.rootDir, file.absolutePath);
    return toApiAwareNode(baseNode, file.content);
  });
  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = buildImportEdges({
    sourceFiles,
    nodeIds,
  });

  return {
    nodes,
    edges,
    summary: {
      pageCount: nodes.filter((n) => n.type === "page").length,
      componentCount: nodes.filter((n) => n.type === "component").length,
      apiCount: nodes.filter((n) => n.type === "api").length,
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
