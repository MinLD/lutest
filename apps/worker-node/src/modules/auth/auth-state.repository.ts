import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AuthStateSummary, AuthStatusResponse } from "@lutest/contracts";

export type StorageState = { cookies?: unknown[]; origins?: unknown[] };
export class AuthStateError extends Error {
  constructor(readonly code: "AUTH_STATE_MISSING" | "AUTH_STATE_INVALID" | "AUTH_STATE_WRITE_FAILED", message: string) {
    super(message); this.name = "AuthStateError";
  }
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const ref = ".lutest/auth/storage-state.json";
export const authStatePaths = (projectRoot: string) => {
  const root = path.resolve(projectRoot, ".lutest", "auth");
  return { authDir: root, statePath: path.join(root, "storage-state.json"), metaPath: path.join(root, "storage-state.meta.json"), storageStateRef: ref };
};
const assertInside = (parent: string, child: string): void => {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new AuthStateError("AUTH_STATE_INVALID", "Auth artifact path must stay inside selected project root");
};
const atomicWrite = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  await fs.writeFile(temp, stableJson(value), "utf-8");
  await fs.rename(temp, filePath);
};
export const validateStorageStateShape = (value: unknown): StorageState => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AuthStateError("AUTH_STATE_INVALID", "Auth storageState must be an object");
  const state = value as Record<string, unknown>;
  if (state.cookies !== undefined && !Array.isArray(state.cookies)) throw new AuthStateError("AUTH_STATE_INVALID", "Auth storageState cookies must be an array");
  if (state.origins !== undefined && !Array.isArray(state.origins)) throw new AuthStateError("AUTH_STATE_INVALID", "Auth storageState origins must be an array");
  return { cookies: state.cookies as unknown[] | undefined, origins: state.origins as unknown[] | undefined };
};
export const saveAuthStorageState = async (projectRoot: string, storageState: unknown): Promise<AuthStateSummary> => {
  const paths = authStatePaths(projectRoot); assertInside(projectRoot, paths.statePath); assertInside(projectRoot, paths.metaPath);
  const state = validateStorageStateShape(storageState); const now = new Date().toISOString();
  try {
    await atomicWrite(paths.statePath, state);
    await atomicWrite(paths.metaPath, { schemaVersion: "auth-storage-state.v1", savedAt: now, updatedAt: now, storageStateRef: paths.storageStateRef, cookieCount: state.cookies?.length ?? 0, originCount: state.origins?.length ?? 0 });
  } catch { throw new AuthStateError("AUTH_STATE_WRITE_FAILED", "Auth storageState could not be written"); }
  return { exists: true, valid: true, savedAt: now, updatedAt: now, storageStateRef: paths.storageStateRef };
};
const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, "utf-8"));
export const readAuthStorageState = async (projectRoot: string): Promise<StorageState> => {
  const paths = authStatePaths(projectRoot); assertInside(projectRoot, paths.statePath);
  try { return validateStorageStateShape(await readJson(paths.statePath)); }
  catch (error) {
    if (error instanceof AuthStateError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new AuthStateError("AUTH_STATE_MISSING", "Auth storageState is missing");
    throw new AuthStateError("AUTH_STATE_INVALID", "Auth storageState is invalid");
  }
};
export const readAuthStatus = async (projectRoot: string): Promise<AuthStatusResponse> => {
  const paths = authStatePaths(projectRoot);
  try { await readAuthStorageState(projectRoot); }
  catch (error) {
    if (error instanceof AuthStateError && error.code === "AUTH_STATE_MISSING") return { status: "missing", exists: false, valid: false };
    return { status: "invalid", exists: true, valid: false, storageStateRef: paths.storageStateRef, error: { code: "AUTH_STATE_INVALID", message: "Auth storageState is invalid" } };
  }
  let meta: Record<string, unknown> = {};
  try { const parsed = await readJson(paths.metaPath); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) meta = parsed as Record<string, unknown>; } catch {}
  return { status: "valid", exists: true, valid: true, savedAt: typeof meta.savedAt === "string" ? meta.savedAt : undefined, updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : undefined, storageStateRef: paths.storageStateRef };
};
export const clearAuthStorageState = async (projectRoot: string) => {
  const paths = authStatePaths(projectRoot); let cleared = false;
  for (const file of [paths.statePath, paths.metaPath]) { assertInside(projectRoot, file); try { await fs.unlink(file); cleared = true; } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; } }
  return { cleared, status: cleared ? "cleared" as const : "missing" as const };
};
