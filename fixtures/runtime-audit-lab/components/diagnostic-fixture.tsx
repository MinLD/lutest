"use client";

import { useEffect, useState } from "react";

type ApiState = { ok: string; failure: string; network: string };

export function DiagnosticFixture() {
  const [apiState, setApiState] = useState<ApiState>({ ok: "pending", failure: "pending", network: "pending" });

  useEffect(() => {
    console.warn("runtime-fixture-console-warning");
    console.error("runtime-fixture-console-error");
    window.setTimeout(() => { throw new Error("runtime-fixture-page-error"); }, 60);
    void fetch("/api/runtime-fixtures/ok")
      .then((response) => response.json())
      .then(() => setApiState((current) => ({ ...current, ok: "200 success" })));
    void fetch("/api/runtime-fixtures/failure")
      .then((response) => setApiState((current) => ({ ...current, failure: `${response.status} expected failure` })));
    void fetch("http://127.0.0.1:9/runtime-fixture-network-error")
      .catch(() => setApiState((current) => ({ ...current, network: "request failed as expected" })));
  }, []);

  return (
    <main className="lab-shell" data-fixture-route="diagnostics">
      <section className="fixture-heading">
        <p className="eyebrow">Browser diagnostics</p>
        <h1>Real API and runtime error capture</h1>
        <p>This route calls real Next route handlers and one deliberately unreachable local endpoint.</p>
      </section>
      <section className="diagnostic-grid">
        <article className="fixture-card"><h2>Successful API</h2><p data-api-state="ok">{apiState.ok}</p></article>
        <article className="fixture-card"><h2>Failed response</h2><p data-api-state="failure">{apiState.failure}</p></article>
        <article className="fixture-card"><h2>Network failure</h2><p data-api-state="network">{apiState.network}</p></article>
        <article className="fixture-card"><h2>Console/page errors</h2><p>Warning, error, and uncaught page error are emitted once after mount.</p></article>
      </section>
    </main>
  );
}
