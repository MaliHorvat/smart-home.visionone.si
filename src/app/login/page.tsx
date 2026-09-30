"use client";

import { FormEvent, useState } from "react";
import { useHome } from "@/context/HomeContext";

export default function LoginPage() {
  const { state } = useHome();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Prijava ni uspela.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Prijava ni uspela.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ha-bg px-4">
      <form onSubmit={onSubmit} className="ha-panel w-full max-w-sm p-8">
        <p className="text-xs text-ha-muted">SmartHome</p>
        <h1 className="mt-2 text-3xl font-medium">{state.settings.homeName}</h1>
        <p className="mt-2 text-sm text-ha-muted">Prijavi se za dostop do nadzorne plošče.</p>
        <label className="mt-6 grid gap-2 text-sm">
          Uporabniško ime
          <input
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="ha-input"
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm">
          Geslo
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ha-input"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy} className="ha-btn mt-6 w-full">
          {busy ? "Prijavljam ..." : "Prijava"}
        </button>
      </form>
    </div>
  );
}
