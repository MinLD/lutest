import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathService } from "./path.service";

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const rejects = async (
  fn: () => Promise<unknown>,
  message: string,
): Promise<void> => {
  let failed = false;

  try {
    await fn();
  } catch {
    failed = true;
  }

  assert(failed, message);
};

const run = async (): Promise<void> => {
  const oldProjectPath = process.env.LUTEST_PROJECT_PATH;

  try {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-service-"));
    const project = path.join(root, "project");
    const child = path.join(project, "child");
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-outside-"));

    await fs.mkdir(child, { recursive: true });
    process.env.LUTEST_PROJECT_PATH = project;

    const resolved = await pathService.resolveProjectPaths({
      cwd: root,
      projectPath: project,
    });

    assert(
      resolved.workerRoot === normalizePath(await fs.realpath(root)),
      "worker root resolved",
    );
    assert(
      resolved.targetProjectRoot === normalizePath(await fs.realpath(project)),
      "target root resolved",
    );
    assert(
      resolved.lutestDir === normalizePath(path.join(await fs.realpath(project), ".lutest")),
      "lutest dir resolved",
    );

    const fallback = await pathService.resolveProjectPaths({ cwd: root });
    assert(
      fallback.targetProjectRoot === normalizePath(await fs.realpath(project)),
      "allowed root fallback works",
    );

    const childPath = await pathService.resolveProjectPaths({
      cwd: root,
      projectPath: child,
    });
    assert(
      childPath.targetProjectRoot === normalizePath(await fs.realpath(child)),
      "child path inside allowed root works",
    );

    await rejects(
      () => pathService.resolveProjectPaths({ cwd: root, projectPath: outside }),
      "outside path rejected",
    );

    await rejects(
      () =>
        pathService.resolveProjectPaths({
          cwd: root,
          projectPath: "relative/path",
        }),
      "relative path rejected",
    );

    console.log("path service self-check passed");
  } finally {
    if (oldProjectPath === undefined) {
      delete process.env.LUTEST_PROJECT_PATH;
    } else {
      process.env.LUTEST_PROJECT_PATH = oldProjectPath;
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
