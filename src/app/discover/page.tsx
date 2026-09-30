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
    importTuya,
  } = useHome();
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null);
  const [haCount, setHaCount] = useState<number | null>(null);
  const [haError, setHaError] = useState("");
  const [tuyaCount, setTuyaCount] = useState<number | null>(null);
  const [tuyaError, setTuyaError] = useState("");
  const [tuyaHint, setTuyaHint] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const configured = Boolean(state.settings.bridgeUrl && state.settings.bridgeToken);
  const tuyaReady = Boolean(state.settings.tuyaClientId && state.settings.tuyaSecret);

  useEffect(() => {
    if (configured) {
      loadBridgeInventory().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs text-ha-muted">Odkrivanje</p>
      <h1 className="mt-2 text-3xl font-medium">Tuya in iskanje naprav</h1>
        <p className="mt-3 max-w-3xl text-ha-muted">
          Tuya / Smart Life releji niso vidni na WiFi skenu — krmiliš jih prek Tuya oblaka.
          Če ima en modul več relejev, uvoz naredi ločen kvadratek za vsako stikalo.
          Temperaturni senzorji (notri ali zunaj) se uvozijo kot kartice s temperaturo.
          Domači strežnik poišče samo Shelly in Tasmota naprave z lokalnim HTTP.
        </p>

      <article className="mt-6 ha-panel">
        <h2 className="text-xl font-medium">Tuya / Smart Life</h2>
        <p className="mt-2 text-sm leading-6 text-ha-muted">
          Če luč prižigaš v Tuya aplikaciji, jo uvozi od tu. Najprej v Nastavitvah vnesi Access ID
          in Access Secret s{" "}
          <a className="text-ha-primary underline" href="https://iot.tuya.com" target="_blank" rel="noreferrer">
            iot.tuya.com
          </a>
          . Uvoz doda tudi temperaturne senzorje, če jih Tuya javi.
        </p>
        <button
          type="button"
          onClick={async () => {
            setTuyaError("");
            setTuyaHint("");
            try {
              const count = await importTuya();
              setTuyaCount(count);
              if (count === 0) {
                setTuyaHint(
                  "Ni novih stikal. Če je modul že uvožen kot ena naprava, jo odpri na plošči: Uredi → število relejev 4 → Dodaj stikala na ploščo. Senzor lahko dodaš tudi ročno: Dodaj napravo → Tuya → tip Senzor.",
                );
              }
            } catch (err) {
              setTuyaError(err instanceof Error ? err.message : "Tuya uvoz ni uspel.");
            }
          }}
          disabled={!tuyaReady}
          className="ha-btn mt-4"
        >
          Uvozi Tuya naprave
        </button>
        {!tuyaReady ? (
          <p className="mt-3 text-sm text-ha-muted">
            Najprej v Nastavitvah vnesi Tuya Access ID in Access Secret.
          </p>
        ) : null}
        {tuyaCount !== null ? (
          <p className="mt-3 text-sm text-ha-primary">
            {tuyaCount === 0 ? "Ni novih Tuya naprav za dodati." : `Dodanih ${tuyaCount} Tuya naprav na ploščo.`}
          </p>
        ) : null}
        {tuyaHint ? <p className="mt-3 text-sm text-ha-muted">{tuyaHint}</p> : null}
        {tuyaError ? <p className="mt-3 text-sm text-red-600">{tuyaError}</p> : null}
      </article>

      <article className="mt-6 ha-panel">
        <h2 className="text-xl font-medium">Domači strežnik</h2>
        {!configured ? (
          <p className="mt-3 text-sm leading-6 text-ha-muted">
            Najprej v Nastavitvah poveži most: na strežnik gre samo ena datoteka, ne celoten
            projekt. Tam so tudi ukazi za kopiranje.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ha-muted">
            Most: {state.settings.bridgeUrl}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={scanViaBridge}
            disabled={!configured || scanning}
            className="ha-btn"
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
            className="ha-btn-ghost disabled:opacity-40"
          >
            Dodaj vse najdene
          </button>
        </div>
        {scanning ? (
          <p className="mt-3 text-sm text-ha-muted">
            Sken traja do minute. Strežnik pregleda celotno omrežje, rezultat se pokaže tukaj.
          </p>
        ) : null}
        {added !== null ? (
          <p className="mt-3 text-sm text-ha-primary">
            {added === 0 ? "Te naprave so že na plošči." : `Dodanih ${added} naprav na ploščo.`}
          </p>
        ) : null}
      </article>

      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-2xl">Najdene naprave</h2>
        <div className="mt-4 grid gap-3">
          {discovered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ha-line px-5 py-8 text-ha-muted">
              Tuya releja tu ne bo. Za Shelly/Tasmota pritisni iskanje, ko most teče.
            </p>
          ) : (
            discovered.map((item) => (
              <article
                key={`${item.integration}-${item.ip}`}
                className="ha-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <h3 className="text-lg font-medium">{item.name}</h3>
                  <p className="text-sm text-ha-muted">
                    {item.ip} · {item.integration} · {item.detail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="ha-btn px-4 py-2 text-sm"
                >
                  Dodaj
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <article className="mt-8 ha-panel">
        <h2 className="text-xl font-medium">Home Assistant</h2>
        <p className="mt-2 text-sm text-ha-muted">Če HA že zbira naprave, jih uvozi tukaj.</p>
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
          className="ha-btn-ghost mt-4 disabled:opacity-40"
        >
          Uvozi entitete
        </button>
        {haCount !== null ? (
          <p className="mt-3 text-sm text-ha-primary">Dodanih {haCount} naprav.</p>
        ) : null}
        {haError ? <p className="mt-3 text-sm text-red-600">{haError}</p> : null}
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
