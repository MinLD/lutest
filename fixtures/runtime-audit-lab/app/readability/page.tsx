export default function ReadabilityFixturePage() {
  return (
    <main className="lab-shell" data-fixture-route="readability">
      <section className="fixture-heading">
        <p className="eyebrow">Future R8.8 fixture</p>
        <h1>Deliberately difficult color readability</h1>
        <p>These cases should remain geometrically valid. R8.8 will add deterministic color evidence.</p>
      </section>
      <section className="readability-grid">
        <article id="fixture-low-contrast" className="readability-card low-contrast"><h2>Low contrast</h2><p>Light gray text on a nearly white surface.</p></article>
        <article id="fixture-inherited-color" className="readability-card inherited-color"><h2>Inherited color</h2><div><p>Foreground color is inherited through nested containers.</p></div></article>
        <article id="fixture-dark-contrast" className="readability-card dark-low-contrast"><h2>Dark theme</h2><p>Dark gray text on a slightly darker background.</p></article>
        <article id="fixture-transparent-background" className="readability-card transparency-stage"><div className="transparent-layer"><h2>Transparency</h2><p>Text readability depends on composited background.</p></div></article>
        <article id="fixture-high-contrast" className="readability-card high-contrast"><h2>Negative control</h2><p>High contrast text must not be reported.</p></article>
      </section>
    </main>
  );
}
