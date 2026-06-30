import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathPolicyService } from "./path-policy.service";

async function main(): Promise<void> {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "lutest-path-policy-"));
  const allowedRoot = path.join(sandbox, "allowed");
  const childRoot = path.join(allowedRoot, "child");
  const siblingRoot = path.join(sandbox, "sibling");
  const ignoredRoot = path.join(allowedRoot, "node_modules");
  const missingRoot = path.join(allowedRoot, "missing");

  await fs.mkdir(childRoot, { recursive: true });
  await fs.mkdir(siblingRoot, { recursive: true });
  await fs.mkdir(ignoredRoot, { recursive: true });

  const config = { allowedRoot };

  const allowed = await pathPolicyService.assertProjectRoot(allowedRoot, config);
  assert.equal(allowed.ok, true, "allowed root passes");

  const child = await pathPolicyService.assertProjectRoot(childRoot, config);
  assert.equal(child.ok, true, "child path inside allowed root passes");

  const defaultRoot = await pathPolicyService.assertProjectRoot(undefined, config);
  assert.equal(defaultRoot.ok, true, "missing request path uses allowed root");

  const sibling = await pathPolicyService.assertProjectRoot(siblingRoot, config);
  assert.equal(sibling.ok, false, "sibling path outside allowed root fails");
  if (!sibling.ok) assert.equal(sibling.code, "PATH_NOT_ALLOWED");

  const missing = await pathPolicyService.assertProjectRoot(missingRoot, config);
  assert.equal(missing.ok, false, "missing path fails clearly");
  if (!missing.ok) assert.equal(missing.code, "PATH_NOT_ALLOWED");

  const ignored = await pathPolicyService.assertProjectRoot(ignoredRoot, config);
  assert.equal(ignored.ok, false, "ignored/generated root fails");
  if (!ignored.ok) assert.equal(ignored.code, "PATH_NOT_ALLOWED");

  console.log("path policy self-check passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
