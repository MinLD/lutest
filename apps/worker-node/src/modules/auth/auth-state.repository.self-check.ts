import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { authStatePaths, clearAuthStorageState, readAuthStatus, readAuthStorageState, saveAuthStorageState } from "./auth-state.repository";

const main = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "lutest-auth-repo-"));
  assert.equal((await readAuthStatus(root)).status, "missing");
  const saved = await saveAuthStorageState(root, { cookies: [{ name: "session", value: "secret" }], origins: [{ origin: "http://localhost:3000", localStorage: [{ name: "token", value: "secret-token" }] }] });
  assert.equal(saved.valid, true);
  const paths = authStatePaths(root);
  await fs.access(paths.statePath); await fs.access(paths.metaPath);
  const status = await readAuthStatus(root);
  assert.equal(status.status, "valid");
  assert.equal(JSON.stringify(status).includes("secret"), false);
  assert.equal(status.storageStateRef, ".lutest/auth/storage-state.json");
  assert.deepEqual((await readAuthStorageState(root)).cookies?.length, 1);
  await fs.writeFile(paths.statePath, "{", "utf-8");
  const invalid = await readAuthStatus(root);
  assert.equal(invalid.status, "invalid");
  assert.equal(JSON.stringify(invalid).includes("secret"), false);
  assert.equal((await clearAuthStorageState(root)).status, "cleared");
  assert.equal((await clearAuthStorageState(root)).status, "missing");
  assert.match(authStatePaths(root).statePath, /\.lutest\/auth\/storage-state\.json$/);
};
void main().then(() => console.log("auth state repository self-check passed"));
