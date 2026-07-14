import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accessCookieName, verifyAccessToken } from "../../lib/auth-fixture/session";

export default async function AdminFixturePage() {
  const session = verifyAccessToken((await cookies()).get(accessCookieName)?.value);
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/login?next=/admin&reason=forbidden");

  return (
    <main className="protected-shell">
      <section className="protected-card" data-authenticated="true" data-role="admin">
        <p className="eyebrow">Admin fixture</p>
        <h1>Admin console</h1>
        <p>This route requires a signed token with the admin role.</p>
        <div className="protected-overlap-stage" aria-label="Overlapping admin controls">
          <button type="button" className="protected-overlap-one">Approve</button>
          <button type="button" className="protected-overlap-two">Reject</button>
        </div>
        <p className="protected-zero-visible">Visible zero-size admin status label.</p>
        <p className="protected-low-contrast">Low contrast admin audit note.</p>
      </section>
    </main>
  );
}
