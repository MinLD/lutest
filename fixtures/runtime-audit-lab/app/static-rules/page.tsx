import { largeStaticFixture } from "../../lib/large-static-fixture";

export default function StaticRulesFixturePage() {
  return (
    <main className="lab-shell" data-fixture-route="static-rules">
      <section className="fixture-heading">
        <p className="eyebrow">Static rule engine</p>
        <h1>Large file, console, and TODO markers</h1>
        <p>The imported source contains {largeStaticFixture.length} deterministic lines for static rule verification.</p>
      </section>
    </main>
  );
}
