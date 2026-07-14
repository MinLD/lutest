"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm({ nextPath, reason }: { nextPath: string; reason?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        next: nextPath,
      }),
    });

    if (!response.ok) {
      setError("Invalid demo credentials");
      return;
    }

    const payload = await response.json() as { redirectTo: string };
    router.push(payload.redirectTo);
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Demo sign in</h1>
      <p>Use admin credentials for protected admin routes. User credentials authenticate but cannot access admin.</p>
      {reason === "forbidden" ? <p className="auth-error">Signed in user lacks access. Use an admin account.</p> : null}
      <label>
        Email
        <input name="email" type="email" defaultValue="admin@lutest.dev" autoComplete="username" />
      </label>
      <label>
        Password
        <input name="password" type="password" defaultValue="password" autoComplete="current-password" />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="submit">Sign in</button>
      <p className="auth-hint">Try user@lutest.dev / password to simulate insufficient role access.</p>
    </form>
  );
}
