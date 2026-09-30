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
    <div className="grid min-h-screen place-items-center bg-ha-bg px-4">
      <form onSubmit={onSubmit} className="ha-panel w-full max-w-sm p-8">
        <p className="text-xs text-ha-muted">SmartHome</p>
        <h1 className="mt-2 text-3xl font-medium">{state.settings.homeName}</h1>
        <p className="mt-2 text-sm text-ha-muted">Vnesi PIN za odklep nadzorne plošče.</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="ha-input mt-6 w-full"
          placeholder="PIN"
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="ha-btn mt-6 w-full">
          Odkleni
        </button>
      </form>
    </div>
  );
}
