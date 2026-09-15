"use client";

import { useEffect, useState } from "react";
import { AddDeviceModal } from "@/components/AddDeviceModal";
import { useHome } from "@/context/HomeContext";
import type { DiscoveredDevice } from "@/lib/types";

export default function DiscoverPage() {
  const {
    state,
    scanning,
    discovered,
    error,
    scanViaBridge,
    loadBridgeInventory,
    addDiscovered,
    importHa,
  } = useHome();
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null);
  const [haCount, setHaCount] = useState<number | null>(null);
  const [haError, setHaError] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const configured = Boolean(state.settings.bridgeUrl && state.settings.bridgeToken);

  useEffect(() => {
    if (configured) {
      loadBridgeInventory().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.24em] text-sand-400">Odkrivanje</p>
      <h1 className="mt-2 text-4xl">Iskanje prek domačega strežnika</h1>
      <p className="mt-3 max-w-3xl text-sand-100/65">
        Tvoj strežnik vidi WiFi, ta aplikacija pa ne. Na strežnik gre samo ena datoteka
        (most) — ne celoten projekt. Most poišče releje, ti jih krmiliš od kjerkoli.
      </p>

      <article className="mt-6 rounded-3xl border border-glow-500/20 bg-ink-800 p-5">
        <h2 className="text-xl">Domači strežnik</h2>
        {!configured ? (
          <p className="mt-3 text-sm leading-6 text-sand-100/70">
            Najprej v Nastavitvah poveži most: na strežnik gre samo ena datoteka, ne celoten
            projekt. Tam so tudi ukazi za kopiranje.
          </p>
        ) : (
          <p className="mt-3 text-sm text-sand-100/70">
            Most: {state.settings.bridgeUrl}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={scanViaBridge}
            disabled={!configured || scanning}
            className="rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950 disabled:opacity-40"
          >
            {scanning ? "Strežnik išče ..." : "Naj strežnik poišče naprave"}
          </button>
          <button
            type="button"
            onClick={() => {
              const count = addDiscovered(discovered);
              setAdded(count);
            }}
            disabled={discovered.length === 0}
            className="rounded-2xl bg-white/10 px-4 py-3 disabled:opacity-40"
          >
            Dodaj vse najdene
          </button>
        </div>
        {scanning ? (
          <p className="mt-3 text-sm text-sand-100/60">
            Sken traja do minute. Strežnik pregleda celotno omrežje, rezultat se pokaže tukaj.
          </p>
        ) : null}
        {added !== null ? (
          <p className="mt-3 text-sm text-glow-400">
            {added === 0 ? "Te naprave so že na plošči." : `Dodanih ${added} naprav na ploščo.`}
          </p>
        ) : null}
      </article>

      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-2xl">Najdene naprave</h2>
        <div className="mt-4 grid gap-3">
          {discovered.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/10 px-5 py-8 text-sand-100/55">
              Še ni najdenih naprav. Ko most teče, pritisni iskanje.
            </p>
          ) : (
            discovered.map((item) => (
              <article
                key={`${item.integration}-${item.ip}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-ink-800 px-5 py-4"
              >
                <div>
                  <h3 className="text-lg">{item.name}</h3>
                  <p className="text-sm text-sand-100/60">
                    {item.ip} · {item.integration} · {item.detail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="rounded-2xl bg-glow-500 px-4 py-2 font-medium text-ink-950"
                >
                  Dodaj
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <article className="mt-8 rounded-3xl border border-white/10 bg-ink-800 p-5">
        <h2 className="text-xl">Home Assistant</h2>
        <p className="mt-2 text-sm text-sand-100/60">Če HA že zbira naprave, jih uvozi tukaj.</p>
        <button
          type="button"
          onClick={async () => {
            setHaError("");
            try {
              const count = await importHa();
              setHaCount(count);
            } catch (err) {
              setHaError(err instanceof Error ? err.message : "Uvoz ni uspel.");
            }
          }}
          disabled={!state.settings.haUrl || !state.settings.haToken}
          className="mt-4 rounded-2xl bg-white/10 px-4 py-3 disabled:opacity-40"
        >
          Uvozi entitete
        </button>
        {haCount !== null ? (
          <p className="mt-3 text-sm text-glow-400">Dodanih {haCount} naprav.</p>
        ) : null}
        {haError ? <p className="mt-3 text-sm text-red-300">{haError}</p> : null}
      </article>

      {selected ? (
        <AddDeviceModal
          preset={{
            name: selected.name,
            address: selected.ip,
            integration: selected.integration,
            kind: selected.kind,
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
