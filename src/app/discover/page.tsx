"use client";

import { useEffect, useState } from "react";
import { AddDeviceModal } from "@/components/AddDeviceModal";
import { useHome } from "@/context/HomeContext";
import { detectLocalSubnet } from "@/lib/devices";
import type { DiscoveredDevice } from "@/lib/types";
import { isHttpsPage, isLocalHost } from "@/lib/utils";

export default function DiscoverPage() {
  const {
    state,
    scanning,
    scanProgress,
    discovered,
    error,
    scanLocal,
    scanViaBridge,
    abortScan,
    importHa,
    updateSettings,
  } = useHome();
  const [https, setHttps] = useState(false);
  const [local, setLocal] = useState(false);
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null);
  const [haCount, setHaCount] = useState<number | null>(null);
  const [haError, setHaError] = useState("");

  useEffect(() => {
    setHttps(isHttpsPage());
    setLocal(isLocalHost());
    detectLocalSubnet().then((subnet) => {
      if (subnet && subnet !== state.settings.subnet) {
        updateSettings({ subnet });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mixedContentBlocked = https && !local && !state.settings.bridgeUrl;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.24em] text-sand-400">Odkrivanje</p>
      <h1 className="mt-2 text-4xl">Poišči naprave v omrežju</h1>
      <p className="mt-3 max-w-3xl text-sand-100/65">
        Vercel v oblaku ne vidi tvojega WiFi omrežja. Lokalni sken deluje, ko aplikacijo odpreš
        na istem omrežju prek HTTP, ali pa prek lokalnega mostu (Raspberry Pi / NAS).
      </p>

      {mixedContentBlocked ? (
        <div className="mt-5 rounded-3xl border border-sand-500/30 bg-sand-500/10 p-5 text-sm leading-6 text-sand-100/80">
          Stran teče prek HTTPS, zato brskalnik blokira neposreden dostop do naprav na
          `192.168.x.x`. Za produkcijo nastavi <strong>lokalni most</strong> ali Home Assistant.
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Lokalni sken</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Pregleda Shelly in Tasmota naprave v podomrežju {state.settings.subnet}.0/24.
          </p>
          <label className="mt-4 grid gap-2 text-sm">
            Podomrežje
            <input
              value={state.settings.subnet}
              onChange={(event) => updateSettings({ subnet: event.target.value })}
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            />
          </label>
          <div className="mt-4 flex gap-2">
            {scanning ? (
              <button type="button" onClick={abortScan} className="rounded-2xl bg-white/10 px-4 py-3">
                Ustavi
              </button>
            ) : (
              <button
                type="button"
                onClick={scanLocal}
                className="rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950"
              >
                Skeniraj WiFi
              </button>
            )}
          </div>
          {scanning ? (
            <p className="mt-3 text-sm text-sand-100/60">
              Pregledanih {scanProgress.done} / {scanProgress.total} naslovov
            </p>
          ) : null}
        </article>

        <article className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Lokalni most</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Zaženi `npm run bridge` doma in most izpostavi prek Cloudflare Tunnel.
          </p>
          <button
            type="button"
            onClick={scanViaBridge}
            disabled={!state.settings.bridgeUrl || scanning}
            className="mt-6 rounded-2xl bg-white/10 px-4 py-3 disabled:opacity-40"
          >
            Skeniraj prek mostu
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Home Assistant</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Uvozi luči in stikala iz obstoječega Home Assistant.
          </p>
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
            className="mt-6 rounded-2xl bg-white/10 px-4 py-3 disabled:opacity-40"
          >
            Uvozi entitete
          </button>
          {haCount !== null ? (
            <p className="mt-3 text-sm text-glow-400">Dodanih {haCount} naprav.</p>
          ) : null}
          {haError ? <p className="mt-3 text-sm text-red-300">{haError}</p> : null}
        </article>
      </section>

      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-2xl">Najdene naprave</h2>
        <div className="mt-4 grid gap-3">
          {discovered.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/10 px-5 py-8 text-sand-100/55">
              Še ni najdenih naprav. Zaženi sken ali dodaj napravo ročno.
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
