import type { GraphResponse } from "@lutest/contracts";
import { pathService } from "../../shared/services/path.service";
import { storageService } from "../../shared/services/storage.service";

const saveLatest = async (input: {
  cwd: string;
  graph: GraphResponse;
  projectPath?: string;
  envProjectPath?: string;
}): Promise<void> => {
  const paths = await pathService.resolveProjectPaths(input);
  await storageService.writeJson(paths.latestGraphPath, input.graph);
};

const findLatest = async (input: {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}): Promise<GraphResponse | null> => {
  const paths = await pathService.resolveProjectPaths(input);
  return storageService.readJson<GraphResponse>(paths.latestGraphPath);
};

export const graphRepository = {
  saveLatest,
  findLatest,
};
