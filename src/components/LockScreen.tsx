"use client";

import { FormEvent, useState } from "react";
import { useHome } from "@/context/HomeContext";

export function LockScreen() {
  const { state, unlock } = useHome();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await unlock(pin);
    if (!ok) setError("Napačen PIN.");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-800 p-8 shadow-panel"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-sand-400">SmartHome</p>
        <h1 className="mt-3 text-3xl">{state.settings.homeName}</h1>
        <p className="mt-2 text-sm text-sand-100/60">Vnesi PIN za odklep nadzorne plošče.</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 outline-none ring-glow-500/40 focus:ring"
          placeholder="PIN"
        />
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950"
        >
          Odkleni
        </button>
      </form>
    </div>
  );
}
