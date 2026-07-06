import path from "node:path";
import type { ProductionGraphResponse } from "@lutest/contracts";
import { storageService } from "../../../shared/services/storage.service";

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

export const productionGraphArtifactPaths = (projectRoot: string) => {
  const graphDir = path.join(projectRoot, ".lutest", "graph");
  return {
    graphDir: normalizePath(graphDir),
    latestGraphPath: normalizePath(path.join(graphDir, "latest-production-graph.json")),
    latestMetaPath: normalizePath(path.join(graphDir, "latest-production-graph.meta.json")),
  };
};

export const saveLatestProductionGraph = async (input: {
  projectRoot: string;
  graph: ProductionGraphResponse;
  generatedAt?: string;
}): Promise<ReturnType<typeof productionGraphArtifactPaths>> => {
  const paths = productionGraphArtifactPaths(input.projectRoot);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  await storageService.writeJson(paths.latestGraphPath, input.graph);
  await storageService.writeJson(paths.latestMetaPath, {
    generatedAt,
    rootDir: normalizePath(input.projectRoot),
    mode: input.graph.mode,
    graphPath: paths.latestGraphPath,
  });
  return paths;
};
