import Link from "next/link";
import catalog from "../fixture-catalog.json";

export default function FixtureCatalogPage() {
  return (
    <main className="lab-shell">
      <section className="lab-hero">
        <p className="eyebrow">Production verification target</p>
        <h1>Runtime detector fixture catalog</h1>
        <p>Every route contains deliberate defects plus negative controls. Run Lutest against this project and a real production Next server.</p>
      </section>
      <section className="catalog-grid">
        {catalog.map((fixture) => (
          <article className="catalog-card" key={fixture.route}>
            <p className="route-label">{fixture.route}</p>
            <h2>{fixture.title}</h2>
            <p>{fixture.expected.length} expected signals · {fixture.negativeControls.length} negative controls</p>
            <Link href={fixture.route}>Open fixture</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
