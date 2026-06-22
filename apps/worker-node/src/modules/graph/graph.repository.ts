import type { GraphResponse } from "@lutest/contracts";
import { fileSystemService } from "../../shared/services/file-system.service";
import { pathService } from "../../shared/services/path.service";

export interface SaveGraphInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  graph: GraphResponse;
}

export interface FindGraphInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

const saveGraph = async (input: SaveGraphInput): Promise<void> => {
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });
  await fileSystemService.writeJsonFile({
    filePath: paths.graphPath,
    data: input.graph,
  });
};

const findGraph = async (
  input: FindGraphInput,
): Promise<GraphResponse | null> => {
  const paths = pathService.resolveProjectPaths({
    cwd: input.cwd,
    projectPath: input.projectPath,
    envProjectPath: input.envProjectPath,
  });

  return fileSystemService.readJsonFile<GraphResponse>({
    filePath: paths.graphPath,
  });
};

export const graphRepository = { saveGraph, findGraph };
