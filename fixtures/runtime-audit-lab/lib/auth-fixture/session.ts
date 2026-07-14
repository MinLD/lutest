import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthRole = "user" | "admin";
export type AuthSession = { email: string; role: AuthRole; exp: number };

export const accessCookieName = "runtime_audit_access";
const sessionTtlSeconds = 60 * 30;
const secret = process.env.RUNTIME_AUDIT_AUTH_SECRET ?? "runtime-audit-lab-dev-secret-change-me";

const users: Record<string, { password: string; role: AuthRole }> = {
  [process.env.RUNTIME_AUDIT_ADMIN_EMAIL ?? "admin@lutest.dev"]: {
    password: process.env.RUNTIME_AUDIT_ADMIN_PASSWORD ?? "password",
    role: "admin",
  },
  [process.env.RUNTIME_AUDIT_USER_EMAIL ?? "user@lutest.dev"]: {
    password: process.env.RUNTIME_AUDIT_USER_PASSWORD ?? "password",
    role: "user",
  },
};

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (payload: string): string => createHmac("sha256", secret).update(payload).digest("base64url");

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const sanitizeNextPath = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  return value;
};

export const authenticate = (email: string, password: string): AuthSession | null => {
  const user = users[email];
  if (!user || user.password !== password) return null;
  return { email, role: user.role, exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds };
};

export const createAccessToken = (session: AuthSession): string => {
  const payload = encode(session);
  return `${payload}.${sign(payload)}`;
};

export const verifyAccessToken = (token: string | undefined): AuthSession | null => {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (!session.email || !session.role || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
};
