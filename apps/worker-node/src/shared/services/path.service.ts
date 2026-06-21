import path from "node:path";
export interface ResolveProjectPathsInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export interface ProjectPaths {
  toolRoot: string;
  targetProjectRoot: string;
  tlxDir: string;
  reportDir: string;
  screenshotDir: string;
  graphPath: string;
}

export const pathService = {
  resolveProjectPaths(input: ResolveProjectPathsInput): ProjectPaths {
    const projectPath = input.projectPath ?? input.envProjectPath ?? ".";

    const toolRoot = path.resolve(input.cwd);

    const targetProjectRoot = path.resolve(input.cwd, projectPath);

    const tlxDir = path.join(targetProjectRoot, ".tlx");
    return {
      toolRoot,
      targetProjectRoot,
      tlxDir,
      reportDir: path.join(tlxDir, "reports"),
      screenshotDir: path.join(tlxDir, "screenshots"),
      graphPath: path.join(tlxDir, "graph.json"),
    };
  },
};
