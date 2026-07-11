"use client";

import { useState } from "react";

type Panel = "baseline" | "details" | "sort" | "accordion" | "modal";

export function InteractionFixture() {
  const [panel, setPanel] = useState<Panel>("baseline");
  return (
    <main className="lab-shell" data-fixture-route="interactions">
      <section className="fixture-heading">
        <p className="eyebrow">R8.7 safe interaction discovery</p>
        <h1>Bounded SPA interaction states</h1>
        <p>Safe controls change local state. Risky controls must remain untouched.</p>
      </section>

      <section className="fixture-card interaction-toolbar">
        <button type="button" role="tab" aria-controls="interaction-state" aria-selected={panel === "details"} onClick={() => setPanel("details")}>Details tab</button>
        <button type="button" aria-haspopup="menu" aria-controls="interaction-state" onClick={() => setPanel("sort")}>Open sort menu</button>
        <button type="button" aria-expanded={panel === "accordion"} aria-controls="interaction-state" onClick={() => setPanel("accordion")}>Expand metrics</button>
        <button type="button" aria-haspopup="dialog" aria-controls="interaction-state" onClick={() => setPanel("modal")}>Open preview dialog</button>
      </section>

      <section id="interaction-state" className={`fixture-card interaction-state state-${panel}`} aria-live="polite">
        <h2>{panel === "baseline" ? "Baseline" : panel}</h2>
        {panel === "details" ? <div className="state-overflow">Details state introduces a deliberate overflow.</div> : null}
        {panel === "sort" ? <div role="menu" className="state-menu"><button type="button">A</button><button type="button">B</button></div> : null}
        {panel === "accordion" ? <p>Expanded metrics content changes DOM geometry and visible text.</p> : null}
        {panel === "modal" ? <div role="dialog" aria-label="Preview dialog" className="state-dialog">Preview dialog state</div> : null}
        {panel === "baseline" ? <p>No safe interaction has run yet.</p> : null}
      </section>

      <section className="fixture-card risky-controls">
        <h2>Controls scanner must skip</h2>
        <button type="button" disabled>Disabled control</button>
        <button type="button">Delete account</button>
        <button type="button">Save changes</button>
        <button type="button">Confirm payment</button>
        <a href="/layout">Open another route</a>
        <form>
          <input required aria-label="Required account name" />
          <button type="button" aria-controls="interaction-state">Open account panel</button>
          <button type="submit">Submit account</button>
        </form>
        <button type="button">Mystery action</button>
      </section>
    </main>
  );
}
