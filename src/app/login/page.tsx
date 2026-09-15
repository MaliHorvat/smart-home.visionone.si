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
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-800 p-8 shadow-panel"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-sand-400">SmartHome</p>
        <h1 className="mt-3 text-3xl">{state.settings.homeName}</h1>
        <p className="mt-2 text-sm text-sand-100/60">Prijavi se za dostop do nadzorne plošče.</p>
        <label className="mt-6 grid gap-2 text-sm">
          Uporabniško ime
          <input
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 outline-none ring-glow-500/40 focus:ring"
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm">
          Geslo
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 outline-none ring-glow-500/40 focus:ring"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950 disabled:opacity-50"
        >
          {busy ? "Prijavljam ..." : "Prijava"}
        </button>
      </form>
    </div>
  );
}
