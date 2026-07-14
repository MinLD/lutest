export default function RouteGroupFixturePage() {
  return (
    <main className="lab-shell">
      <section className="lab-hero">
        <p className="eyebrow">Next.js route group fixture</p>
        <h1>Public route survives route-group normalization</h1>
        <p>This page lives at <code>app/(main)/route-group/page.tsx</code> but must scan as <code>/route-group</code>.</p>
      </section>
      <section className="catalog-card">
        <p className="route-label">/route-group</p>
        <h2>No <code>/(main)</code> URL segment should appear in runtime targets.</h2>
        <p>If Lutest emits <code>/(main)/route-group</code>, the route normalizer is still broken.</p>
      </section>
    </main>
  );
}
