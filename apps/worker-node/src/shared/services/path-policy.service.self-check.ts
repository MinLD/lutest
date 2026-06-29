import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { pathPolicyService } from "./path-policy.service";

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-policy-"));

  try {
    const allowed = await pathPolicyService.assertProjectRoot(root);
    assert.equal(allowed.ok, true);

    const missing = await pathPolicyService.assertProjectRoot(
      path.join(root, "missing"),
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "PATH_NOT_ALLOWED");

    await fs.mkdir(path.join(root, "node_modules"));
    const blocked = await pathPolicyService.assertProjectRoot(
      path.join(root, "node_modules"),
    );
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, "PATH_NOT_ALLOWED");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
