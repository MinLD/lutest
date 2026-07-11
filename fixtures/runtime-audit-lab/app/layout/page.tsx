export default function LayoutFixturePage() {
  return (
    <main className="lab-shell" data-fixture-route="layout">
      <section className="fixture-heading">
        <p className="eyebrow">Current runtime detectors</p>
        <h1>Layout geometry failures</h1>
        <p>Every red block is intentionally invalid. Green blocks are negative controls that must not be reported.</p>
      </section>

      <section className="fixture-card">
        <h2>Horizontal overflow</h2>
        <div id="fixture-horizontal-overflow" className="horizontal-overflow">This element is intentionally 1800px wide.</div>
      </section>

      <section className="fixture-card fixed-height-card">
        <h2>Outside viewport</h2>
        <div id="fixture-outside-viewport" className="outside-viewport">Fully outside left</div>
        <p>The red element is positioned completely left of the viewport.</p>
      </section>

      <section className="fixture-card">
        <h2>Small click targets with insufficient spacing</h2>
        <div className="small-target-cluster">
          <button id="fixture-small-target-a" type="button" aria-label="Tiny previous">‹</button>
          <button id="fixture-small-target-b" type="button" aria-label="Tiny next">›</button>
        </div>
        <button id="fixture-small-target-negative" className="isolated-target" type="button">30px isolated control</button>
      </section>

      <section className="fixture-card overlap-stage">
        <h2>Suspicious overlap</h2>
        <button id="fixture-overlap-a" className="overlap-button overlap-a" type="button">Primary</button>
        <button id="fixture-overlap-b" className="overlap-button overlap-b" type="button">Related</button>
      </section>

      <section className="fixture-card zero-stage">
        <h2>Zero-size visible element</h2>
        <button id="fixture-zero-size" className="zero-size-visible" type="button">Visible text escaping a zero-size box</button>
      </section>

      <section className="fixture-card negative-card">
        <h2>Negative control: clipped transformed canvas</h2>
        <div className="canvas-clip">
          <div id="fixture-clipped-canvas" className="canvas-plane">Movable canvas plane</div>
        </div>
      </section>

      <section className="fixture-card negative-card below-fold-control">
        <h2>Negative control: normal below-fold content</h2>
        <p>This card is intentionally below the first viewport but remains normal document content.</p>
      </section>
    </main>
  );
}
