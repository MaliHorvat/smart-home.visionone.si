"use client";

import { FormEvent, useState } from "react";
import { useHome } from "@/context/HomeContext";

export default function SettingsPage() {
  const { state, updateSettings, setPin, addRoom, resetDemo, importState, testBridge } = useHome();
  const [pin, setPinValue] = useState("");
  const [roomName, setRoomName] = useState("");
  const [saved, setSaved] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState("");

  async function savePin(event: FormEvent) {
    event.preventDefault();
    await setPin(pin);
    setPinValue("");
    setSaved(pin ? "PIN je nastavljen." : "PIN je odstranjen.");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs uppercase tracking-[0.24em] text-sand-400">Nastavitve</p>
      <h1 className="mt-2 text-4xl">Dom, most in zaščita</h1>

      <section className="mt-8 grid gap-4">
        <label className="grid gap-2 rounded-3xl border border-white/10 bg-ink-800 p-5">
          Ime doma
          <input
            value={state.settings.homeName}
            onChange={(event) => updateSettings({ homeName: event.target.value })}
            className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
        </label>

        <div className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Velikost kvadratkov</h2>
          <p className="mt-2 text-sm text-sand-100/60">Na telefonu. 3 so lažje za zadeti v avtu.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ tileColumns: 4 })}
              className={`rounded-2xl px-4 py-3 ${state.settings.tileColumns !== 3 ? "bg-glow-500 text-ink-950" : "bg-white/10"}`}
            >
              4 v vrsti
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ tileColumns: 3 })}
              className={`rounded-2xl px-4 py-3 ${state.settings.tileColumns === 3 ? "bg-glow-500 text-ink-950" : "bg-white/10"}`}
            >
              3 v vrsti
            </button>
          </div>
        </div>

        <form onSubmit={savePin} className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">PIN zaklep</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Priporočeno, ker bo aplikacija na javni domeni lahko krmilila hišo.
          </p>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPinValue(event.target.value)}
            placeholder={state.settings.pinHash ? "Nov PIN ali prazno za odstranitev" : "Nastavi PIN"}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <button type="submit" className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
            Shrani PIN
          </button>
          {saved ? <p className="mt-3 text-sm text-glow-400">{saved}</p> : null}
        </form>

        <div className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Domači strežnik (most)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-sand-100/70">
            <li>Na strežniku skopiraj ta projekt in zaženi <span className="text-sand-400">npm run bridge:win</span> (Windows) ali <span className="text-sand-400">npm run bridge</span>.</li>
            <li>Žeton se shrani v <span className="text-sand-400">bridge/token.txt</span>. Prilepi ga spodaj.</li>
            <li>
              Most mora biti dosegljiv prek HTTPS. Najenostavneje: na strežniku
              <span className="text-sand-400"> cloudflared tunnel --url http://localhost:8787</span>
              in dobljeni naslov vpiši tu.
            </li>
          </ol>
          <input
            value={state.settings.bridgeUrl}
            onChange={(event) => updateSettings({ bridgeUrl: event.target.value })}
            placeholder="https://xxxx.trycloudflare.com"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <input
            value={state.settings.bridgeToken}
            onChange={(event) => updateSettings({ bridgeToken: event.target.value })}
            placeholder="Žeton iz token.txt"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const info = await testBridge();
                  setBridgeStatus(
                    `Povezano z ${info.hostname}. Najdenih ${info.deviceCount} naprav. Omrežja: ${info.subnets.join(", ") || "—"}.`,
                  );
                } catch (err) {
                  setBridgeStatus(err instanceof Error ? err.message : "Most ni dosegljiv.");
                }
              }}
              disabled={!state.settings.bridgeUrl || !state.settings.bridgeToken}
              className="rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950 disabled:opacity-40"
            >
              Preizkusi povezavo
            </button>
            <button
              type="button"
              onClick={() => {
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);
                const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
                updateSettings({ bridgeToken: token });
              }}
              className="rounded-2xl bg-white/10 px-4 py-3"
            >
              Ustvari žeton
            </button>
          </div>
          {bridgeStatus ? <p className="mt-3 text-sm text-sand-100/75">{bridgeStatus}</p> : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Home Assistant</h2>
          <input
            value={state.settings.haUrl}
            onChange={(event) => updateSettings({ haUrl: event.target.value })}
            placeholder="https://tvoje-ha.ui.nabu.casa"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <input
            type="password"
            value={state.settings.haToken}
            onChange={(event) => updateSettings({ haToken: event.target.value })}
            placeholder="Long-lived access token"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!roomName.trim()) return;
            addRoom(roomName.trim());
            setRoomName("");
          }}
          className="rounded-3xl border border-white/10 bg-ink-800 p-5"
        >
          <h2 className="text-xl">Prostori</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.rooms.map((room) => (
              <span key={room.id} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                {room.name}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Nov prostor"
              className="flex-1 rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            />
            <button type="submit" className="rounded-2xl bg-white/10 px-4 py-3">
              Dodaj
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Varnostna kopija</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Shrani ploščo v datoteko ali jo naloži na nov telefon.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "smarthome-backup.json";
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-2xl bg-white/10 px-4 py-3"
            >
              Izvozi
            </button>
            <label className="cursor-pointer rounded-2xl bg-white/10 px-4 py-3">
              Uvozi
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  importState(JSON.parse(text));
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={resetDemo}
          className="rounded-3xl border border-white/10 bg-ink-800 px-5 py-4 text-left text-sand-100/70"
        >
          Ponastavi demo naprave in ploščo
        </button>
      </section>
    </div>
  );
}
