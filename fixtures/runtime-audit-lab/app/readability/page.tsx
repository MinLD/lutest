export default function ReadabilityFixturePage() {
  return (
    <main className="lab-shell" data-fixture-route="readability">
      <section className="fixture-heading">
        <p className="eyebrow">R8.8 production fixture</p>
        <h1>Deliberately difficult color readability</h1>
        <p>
          These cases remain geometrically valid while exercising deterministic
          WCAG contrast evidence.
        </p>
      </section>
      <section className="readability-grid">
        <article
          id="fixture-low-contrast"
          className="readability-card low-contrast"
        >
          <h2 id="fixture-low-contrast-title">Low contrast</h2>

          <p id="fixture-low-contrast-body">
            Light gray text on a nearly white surface.
          </p>
        </article>
        <article id="fixture-low-contrast" className="readability-card ">
          <h2 className="text-[#8d9198]"> #8d9198 - Low contrast 2</h2>
        </article>
        <article
          id="fixture-inherited-color"
          className="readability-card inherited-color"
        >
          <h2 id="fixture-inherited-title">Inherited color</h2>
          <div>
            <p id="fixture-inherited-body">
              Foreground color is inherited through nested containers.
            </p>
          </div>
        </article>
        <article
          id="fixture-dark-contrast"
          className="readability-card dark-low-contrast"
        >
          <h2 id="fixture-dark-title">Dark theme</h2>
          <p id="fixture-dark-body">
            Dark gray text on a slightly darker background.
          </p>
        </article>
        <article
          id="fixture-transparent-background"
          className="readability-card transparency-stage"
        >
          <div className="transparent-layer">
            <h2 id="fixture-transparent-title">Transparency</h2>
            <p id="fixture-transparent-body">
              Text readability depends on composited background.
            </p>
          </div>
        </article>
        <article
          id="fixture-high-contrast"
          className="readability-card high-contrast"
        >
          <h2 id="fixture-high-contrast-title">Negative control</h2>
          <p id="fixture-high-contrast-body">
            High contrast text must not be reported.
          </p>
        </article>
      </section>
    </main>
  );
}
