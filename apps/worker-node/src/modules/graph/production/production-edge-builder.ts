import fs from "node:fs/promises";
import type { ProductionGraphEdge, ProductionGraphNode } from "@lutest/contracts";
import { extractTsJsImports } from "../import-resolver/extract-ts-js-imports";
import { resolveImportTarget } from "../import-resolver/resolve-import-target";
import { readTsconfigPathSettings } from "../import-resolver/tsconfig-paths";
import type { ProductionProjectScanResult, ScannedProductionSourceFile } from "./production-project-scanner";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const fileNodeId = (filePath: string): string => `file:${normalizePath(filePath)}`;

const importEdgeId = (source: string, target: string): string =>
  `import:${source}->${target}`;

const fileNodeIds = (nodes: ProductionGraphNode[]): Set<string> =>
  new Set(nodes.filter((node) => node.kind === "file").map((node) => node.id));

const buildFileImportEdges = async (input: {
  file: ScannedProductionSourceFile;
  projectRoot: string;
  targetFileNodeIds: Set<string>;
  tsconfig: Awaited<ReturnType<typeof readTsconfigPathSettings>>;
}): Promise<ProductionGraphEdge[]> => {
  const content = await fs.readFile(input.file.absolutePath, "utf-8");
  const source = fileNodeId(input.file.relativePath);
  const imports = extractTsJsImports({
    sourceFilePath: input.file.relativePath,
    content,
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

export const buildProductionImportEdges = async (input: {
  scan: ProductionProjectScanResult;
  nodes: ProductionGraphNode[];
}): Promise<ProductionGraphEdge[]> => {
  const targetFileNodeIds = fileNodeIds(input.nodes);
  const tsconfig = await readTsconfigPathSettings(input.scan.rootDir);
  const edges = new Map<string, ProductionGraphEdge>();

  for (const file of input.scan.files) {
    for (const edge of await buildFileImportEdges({
      file,
      projectRoot: input.scan.rootDir,
      targetFileNodeIds,
      tsconfig,
    })) {
      edges.set(edge.id, edge);
    }
  }

  return Array.from(edges.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
};
