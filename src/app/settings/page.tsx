"use client";

import { FormEvent, useState } from "react";
import { CopyBlock } from "@/components/CopyBlock";
import { useHome } from "@/context/HomeContext";

const BRIDGE_URL =
  "https://raw.githubusercontent.com/MaliHorvat/smart-home.visionone.si/main/bridge/server.mjs";

const WIN_SETUP = `New-Item -ItemType Directory -Force C:\\smarthome-bridge | Out-Null
Set-Location C:\\smarthome-bridge
Invoke-WebRequest -Uri "${BRIDGE_URL}" -OutFile server.mjs
node server.mjs`;

const LINUX_SETUP = `mkdir -p ~/smarthome-bridge && cd ~/smarthome-bridge
curl -fsSL -o server.mjs ${BRIDGE_URL}
node server.mjs`;

const TUNNEL_INSTALL = `winget install -e --id Cloudflare.cloudflared`;

const TUNNEL = "cloudflared tunnel --url http://localhost:8787";

export default function SettingsPage() {
  const { state, updateSettings, setPin, addRoom, resetDemo, importState, testBridge } = useHome();
  const [pin, setPinValue] = useState("");
  const [roomName, setRoomName] = useState("");
  const [saved, setSaved] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState("");
  const [tuyaStatus, setTuyaStatus] = useState("");

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
          <h2 className="text-xl">Domači strežnik</h2>
          <p className="mt-2 text-sm leading-6 text-sand-100/70">
            Celotnega projekta ne rabiš. Na strežnik gre <strong>ena datoteka</strong>, ki poišče
            releje (Shelly, Tasmota) v omrežju. Aplikacija jih potem krmili od kjerkoli.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-sand-100/70">
            <li>Namesti Node.js, če ga še ni: nodejs.org</li>
            <li>Na strežniku zaženi ukaz spodaj in pusti okno odprto.</li>
            <li>Žeton se zapiše v token.txt — prilepi ga spodaj.</li>
            <li>V drugem oknu najprej namesti Cloudflare tunel, nato ga zaženi.</li>
          </ol>
          <CopyBlock label="Windows (PowerShell)" value={WIN_SETUP} />
          <CopyBlock label="Linux" value={LINUX_SETUP} />
          <CopyBlock label="Windows: namesti tunel (samo enkrat)" value={TUNNEL_INSTALL} />
          <CopyBlock label="Nato v NOVEM oknu PowerShell" value={TUNNEL} />
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
          </div>
          {bridgeStatus ? <p className="mt-3 text-sm text-sand-100/75">{bridgeStatus}</p> : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-ink-800 p-5">
          <h2 className="text-xl">Tuya / Smart Life</h2>
          <p className="mt-2 text-sm leading-6 text-sand-100/70">
            Releji iz Tuya aplikacije niso vidni na WiFi skenu. Poveži isti račun prek Tuya oblaka:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-sand-100/70">
            <li>
              Odpri{" "}
              <a className="text-glow-400 underline" href="https://iot.tuya.com" target="_blank" rel="noreferrer">
                iot.tuya.com
              </a>{" "}
              in se registriraj.
            </li>
            <li>Cloud → Development → Create Cloud Project (Data Center: Central Europe).</li>
            <li>Service API → odobri IoT Core in Device Status Notification.</li>
            <li>Devices → Link Tuya App Account → QR kodo skeniraj s Tuya / Smart Life app.</li>
            <li>Overview → Access ID in Access Secret prilepi sem.</li>
          </ol>
          <select
            value={state.settings.tuyaRegion}
            onChange={(event) => updateSettings({ tuyaRegion: event.target.value })}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          >
            <option value="eu">Evropa (priporočeno)</option>
            <option value="us">ZDA</option>
            <option value="cn">Kitajska</option>
            <option value="in">Indija</option>
          </select>
          <input
            value={state.settings.tuyaClientId}
            onChange={(event) => updateSettings({ tuyaClientId: event.target.value })}
            placeholder="Access ID"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <input
            type="password"
            value={state.settings.tuyaSecret}
            onChange={(event) => updateSettings({ tuyaSecret: event.target.value })}
            placeholder="Access Secret"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
          <button
            type="button"
            onClick={async () => {
              setTuyaStatus("Preverjam Tuya ...");
              try {
                const response = await fetch("/api/tuya/devices", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clientId: state.settings.tuyaClientId,
                    secret: state.settings.tuyaSecret,
                    region: state.settings.tuyaRegion,
                  }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Tuya ni dosegljiv.");
                const count = Array.isArray(data.devices) ? data.devices.length : 0;
                setTuyaStatus(
                  count > 0
                    ? `Tuya povezan. Najdenih ${count} naprav. Uvozi jih na strani Odkrivanje.`
                    : data.hint || "Tuya povezan, ampak ni naprav. Poveži Smart Life račun v iot.tuya.com.",
                );
              } catch (error) {
                setTuyaStatus(error instanceof Error ? error.message : "Tuya ni dosegljiv.");
              }
            }}
            disabled={!state.settings.tuyaClientId || !state.settings.tuyaSecret}
            className="mt-4 rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950 disabled:opacity-40"
          >
            Preizkusi Tuya
          </button>
          {tuyaStatus ? <p className="mt-3 text-sm text-sand-100/75">{tuyaStatus}</p> : null}
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
