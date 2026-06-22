import fs from "node:fs/promises";
import type { GraphResponse } from "@lutest/contracts";
import { graphMapper } from "./graph.mapper";
import { graphRepository } from "./graph.repository";
export interface BuildProjectGraphInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
  projectRoot: string;
  sourceFiles: string[];
}

export interface GetGraphInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}
const importRegex =
  /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|require\(["']([^"']+)["']\)/g;

const extractImports = (content: string): string[] => {
  const imports: string[] = [];
  for (const match of content.matchAll(importRegex)) {
    const importPath = match[1] ?? match[2];
    if (importPath) imports.push(importPath);
  }
  return imports;
};
export const graphService = {
  async buildProjectGraph(
    input: BuildProjectGraphInput,
  ): Promise<GraphResponse> {
    const entries = await Promise.all(
      input.sourceFiles.map(async (filePath: string) => {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          return {
            filePath,
            imports: extractImports(content),
          };
        } catch {
          return {
            filePath,
            imports: [],
          };
        }
      }),
    );
    const importsByFile: Record<string, string[]> = Object.fromEntries(
      entries.map((entry) => [entry.filePath, entry.imports]),
    );

    const graph = graphMapper.toSourceFileGraph({
      projectRoot: input.projectRoot,
      sourceFiles: input.sourceFiles,
      importsByFile,
    });
    await graphRepository.saveGraph({
      cwd: input.cwd,
      projectPath: input.projectPath,
      envProjectPath: input.envProjectPath,
      graph,
    });
    return graph;
  },
  async getGraph(input: GetGraphInput): Promise<GraphResponse> {
    const graph = await graphRepository.findGraph({
      cwd: input.cwd,
      projectPath: input.projectPath,
      envProjectPath: input.envProjectPath,
    });

    return graph ?? graphMapper.toEmptyGraph();
  },
};
