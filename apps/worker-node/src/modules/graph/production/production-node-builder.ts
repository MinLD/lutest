import path from "node:path";
import type {
  ProductionGraphNode,
  ProductionGraphNodeKind,
} from "@lutest/contracts";
import type { ClassifiedSourceSymbol } from "../source-extractors/source-extractor.types";
import type { ScannedProductionSourceFile } from "./production-project-scanner";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const fileNameWithoutExtension = (filePath: string): string =>
  path.basename(filePath).replace(/\.[^.]+$/, "");

const fileNodeId = (filePath: string): string =>
  `file:${normalizePath(filePath)}`;

const symbolNodeId = (symbol: ClassifiedSourceSymbol): string => symbol.id;

const toNodeKind = (
  kind: ClassifiedSourceSymbol["kind"],
): ProductionGraphNodeKind => kind;

const toFileNode = (
  file: ScannedProductionSourceFile,
): ProductionGraphNode => ({
  id: fileNodeId(file.relativePath),
  kind: "file",
  name: path.basename(file.relativePath),
  filePath: file.relativePath,
  confidence: "high",
  reason: "Source file included in production scan",
});

const toSymbolNode = (symbol: ClassifiedSourceSymbol): ProductionGraphNode => ({
  id: symbolNodeId(symbol),
  kind: toNodeKind(symbol.kind),
  name: symbol.name || fileNameWithoutExtension(symbol.filePath),
  filePath: normalizePath(symbol.filePath),
  loc: symbol.loc,
  route: symbol.route,
  confidence: symbol.confidence,
  reason: symbol.reason,
});

export const buildProductionGraphNodes = (
  files: ScannedProductionSourceFile[],
): ProductionGraphNode[] => {
  const nodes = new Map<string, ProductionGraphNode>();
  for (const file of files) {
    const fileNode = toFileNode(file);
    nodes.set(fileNode.id, fileNode);
    for (const symbol of file.symbols) {
      const symbolNode = toSymbolNode(symbol);
      nodes.set(symbolNode.id, symbolNode);
    }
  }
  return Array.from(nodes.values());
};
