import { NextResponse } from "next/server";
import { accessCookieName, authenticate, createAccessToken, sanitizeNextPath } from "../../../../lib/auth-fixture/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; next?: string } | null;
  const session = authenticate(body?.email ?? "", body?.password ?? "");
  if (!session) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const redirectTo = sanitizeNextPath(body?.next);
  const response = NextResponse.json({ redirectTo, role: session.role });
  response.cookies.set(accessCookieName, createAccessToken(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  return response;
}
