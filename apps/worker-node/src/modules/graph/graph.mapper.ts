import path from "node:path";
import type { GraphEdge, GraphNode, GraphResponse } from "@lutest/contracts";

export interface BuildGraphInput {
  projectRoot: string;
  sourceFiles: string[];
  importsByFile: Record<string, string[]>;
}

const normalizePath = (value: string): string => {
  return value.replaceAll("\\", "/");
};

const toFileNodeId = (relativePath: string): string => {
  return `file:${normalizePath(relativePath)}`;
};

const classifyNodeType = (relativePath: string): GraphNode["type"] => {
  if (/(?:pages|app|routes)[\\/].*\.(tsx|ts|jsx|js)$/.test(relativePath)) {
    return "page";
  }

  if (/(?:components|ui)[\\/].*\.(tsx|ts|jsx|js)$/.test(relativePath)) {
    return "component";
  }

  if (/(?:api|server|services)[\\/].*\.(tsx|ts|jsx|js)$/.test(relativePath)) {
    return "api";
  }

  return "file";
};

const toImportEdgeId = (
  source: string,
  target: string,
  index: number,
): string => {
  return `import:${source}->${target}:${index}`;
};

const createSummary = (nodes: GraphNode[]): GraphResponse["summary"] => {
  return {
    pageCount: nodes.filter((node) => node.type === "page").length,
    componentCount: nodes.filter((node) => node.type === "component").length,
    apiCount: nodes.filter((node) => node.type === "api").length,
    fileCount: nodes.length,
  };
};

const toSourceFileGraph = (input: BuildGraphInput): GraphResponse => {
  const nodes: GraphNode[] = input.sourceFiles.map((filePath) => {
    const relativePath = normalizePath(
      path.relative(input.projectRoot, filePath),
    );

    return {
      id: toFileNodeId(relativePath),
      type: classifyNodeType(relativePath),
      label: path.basename(filePath),
      filePath: relativePath,
    };
  });

  const nodeByRelativePath = new Map(
    nodes.map((node) => [node.filePath, node]),
  );

  const edges: GraphEdge[] = [];

  input.sourceFiles.forEach((sourceFilePath) => {
    const sourceRelativePath = normalizePath(
      path.relative(input.projectRoot, sourceFilePath),
    );

    const sourceNodeId = toFileNodeId(sourceRelativePath);
    const imports = input.importsByFile[sourceFilePath] ?? [];

    imports.forEach((importPath, index) => {
      if (!importPath.startsWith(".")) return;

      const resolvedCandidate = normalizePath(
        path.relative(
          input.projectRoot,
          path.resolve(path.dirname(sourceFilePath), importPath),
        ),
      );

      const matchedTarget =
        nodeByRelativePath.get(resolvedCandidate) ??
        nodeByRelativePath.get(`${resolvedCandidate}.ts`) ??
        nodeByRelativePath.get(`${resolvedCandidate}.tsx`) ??
        nodeByRelativePath.get(`${resolvedCandidate}.js`) ??
        nodeByRelativePath.get(`${resolvedCandidate}.jsx`) ??
        nodeByRelativePath.get(`${resolvedCandidate}/index.ts`) ??
        nodeByRelativePath.get(`${resolvedCandidate}/index.tsx`) ??
        nodeByRelativePath.get(`${resolvedCandidate}/index.js`) ??
        nodeByRelativePath.get(`${resolvedCandidate}/index.jsx`);

      if (!matchedTarget) return;

      edges.push({
        id: toImportEdgeId(sourceNodeId, matchedTarget.id, index),
        source: sourceNodeId,
        target: matchedTarget.id,
        type: "import",
      });
    });
  });

  return {
    nodes,
    edges,
    summary: createSummary(nodes),
  };
};

const toEmptyGraph = (): GraphResponse => {
  const nodes: GraphNode[] = [];

  return {
    nodes,
    edges: [],
    summary: createSummary(nodes),
  };
};

export const graphMapper = {
  toSourceFileGraph,
  toEmptyGraph,
};