import path from "node:path";
import type {
  GraphEdge,
  GraphResponse,
  ImportEdgeData,
  SourceFileNodeData,
} from "@lutest/contracts";
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

const toImportEdgeId = (
  source: string,
  target: string,
  index: number,
): string => {
  return `import:${source}->${target}:${index}`;
};
const toSourceFileGraph = (input: BuildGraphInput): GraphResponse => {
  const nodes = input.sourceFiles.map((filePath) => {
    const relativePath = normalizePath(
      path.relative(input.projectRoot, filePath),
    );

    return {
      id: toFileNodeId(relativePath),
      type: "component" as const,
      label: relativePath,
      data: {
        filePath,
        relativePath,
        extension: path.extname(filePath),
      } satisfies SourceFileNodeData,
    };
  });

  const nodeByRelativePath = new Map(
    nodes.map((node) => [(node.data as SourceFileNodeData).relativePath, node]),
  );

  const edges: GraphEdge<ImportEdgeData>[] = [];

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
        data: {
          importPath,
          resolvedPath: (matchedTarget.data as SourceFileNodeData).relativePath,
        },
      });
    });
  });

  return {
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
  } as unknown as GraphResponse;
};

const toEmptyGraph = (): GraphResponse => {
  return {
    nodes: [],
    edges: [],
    generatedAt: new Date().toISOString(),
  };
};

export const graphMapper = {
  toSourceFileGraph,
  toEmptyGraph,
};
