"use client";

import { useEffect, useState } from "react";

export function ProtectedApiFixture({ label }: { label: string }) {
  const [state, setState] = useState("pending API failure");

  useEffect(() => {
    void fetch("/api/runtime-fixtures/failure")
      .then((response) => setState(`${label} API returned ${response.status}`));
    void fetch("http://127.0.0.1:9/protected-runtime-network-error").catch(() => undefined);
  }, [label]);

  return <p className="auth-hint" data-protected-api-state={label}>{state}</p>;
}
