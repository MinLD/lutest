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
  const oldAllowedRoots = process.env.LUTEST_ALLOWED_ROOTS;
  process.env.LUTEST_ALLOWED_ROOTS = "";

  try {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-policy-"));
    const project = path.join(root, "project");
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-outside-"));

    await fs.mkdir(project);

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
      fallback.targetProjectRoot === normalizePath(await fs.realpath(root)),
      "cwd fallback works",
    );

    await rejects(
      () => pathService.resolveProjectPaths({ cwd: root, projectPath: outside }),
      "outside path rejected",
    );

    await rejects(
      () =>
        pathService.resolveProjectPaths({
          cwd: root,
          projectPath: path.join(root, ".."),
        }),
      "path traversal rejected",
    );

    await rejects(
      () =>
        pathService.resolveProjectPaths({
          cwd: root,
          projectPath: "relative/path",
        }),
      "relative path rejected",
    );

    process.env.LUTEST_ALLOWED_ROOTS = outside;
    const allowedOutside = await pathService.resolveProjectPaths({
      cwd: root,
      projectPath: outside,
    });

    assert(
      allowedOutside.targetProjectRoot === normalizePath(await fs.realpath(outside)),
      "configured allowed root works",
    );

    console.log("path policy self-check passed");
  } finally {
    if (oldAllowedRoots === undefined) {
      delete process.env.LUTEST_ALLOWED_ROOTS;
    } else {
      process.env.LUTEST_ALLOWED_ROOTS = oldAllowedRoots;
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});