import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accessCookieName, verifyAccessToken } from "../../lib/auth-fixture/session";

export default async function ProtectedDashboardFixturePage() {
  const session = verifyAccessToken((await cookies()).get(accessCookieName)?.value);
  if (!session) redirect("/login?next=/dashboard");

  return (
    <main className="protected-shell">
      <section className="protected-card" data-authenticated="true">
        <p className="eyebrow">Authenticated fixture</p>
        <h1>Protected dashboard</h1>
        <p>Signed in as {session.email} with role {session.role}.</p>
        <Link href="/admin">Open admin area</Link>
        <div className="protected-ux-overflow">This intentionally overflows on mobile to prove protected route layout issues are detected.</div>
        <p className="protected-low-contrast">Low contrast protected dashboard helper text.</p>
        <div className="protected-small-actions" aria-label="Tiny protected dashboard actions">
          <button type="button">A</button>
          <button type="button">B</button>
        </div>
      </section>
    </main>
  );
}
