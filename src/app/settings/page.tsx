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
  const { state, updateSettings, setPin, addRoom, resetDemo, importState, testBridge, pushToCloud, pullFromCloud, syncing } = useHome();
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
      <p className="text-xs text-ha-muted">Nastavitve</p>
      <h1 className="mt-2 text-3xl font-medium">Dom, most in zaščita</h1>

      <section className="mt-8 grid gap-4">
        <label className="grid gap-2 ha-panel">
          Ime doma
          <input
            value={state.settings.homeName}
            onChange={(event) => updateSettings({ homeName: event.target.value })}
            className="ha-input"
          />
        </label>

        <div className="ha-panel">
          <h2 className="text-xl">Velikost kartic</h2>
          <p className="mt-2 text-sm text-ha-muted">Na telefonu. 2 stolpca sta kot v Home Assistant.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ tileColumns: 4 })}
              className={`rounded-xl px-4 py-3 ${state.settings.tileColumns !== 3 ? "bg-ha-primary text-white" : "ha-btn-ghost"}`}
            >
              2 v vrsti
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ tileColumns: 3 })}
              className={`rounded-xl px-4 py-3 ${state.settings.tileColumns === 3 ? "bg-ha-primary text-white" : "ha-btn-ghost"}`}
            >
              3 v vrsti
            </button>
          </div>
        </div>

        <div className="ha-panel">
          <h2 className="text-xl">Prijava</h2>
          <p className="mt-2 text-sm leading-6 text-ha-muted">
            En uporabnik: <strong>admin</strong>. Geslo je na strežniku, seja v piškotku 30 dni.
            Baze ni. Če želiš drugo geslo, ga nastavi v Vercel kot <code>AUTH_PASSWORD</code>.
          </p>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="ha-btn-ghost mt-4"
          >
            Odjava
          </button>
        </div>

        <form onSubmit={savePin} className="ha-panel">
          <h2 className="text-xl">PIN zaklep</h2>
          <p className="mt-2 text-sm text-ha-muted">
            Dodatno, na tem telefonu. Glavna zaščita je prijava (admin). Baze ne rabiš.
          </p>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPinValue(event.target.value)}
            placeholder={state.settings.pinHash ? "Nov PIN ali prazno za odstranitev" : "Nastavi PIN"}
            className="mt-4 w-full ha-input"
          />
          <button type="submit" className="ha-btn-ghost mt-4">
            Shrani PIN
          </button>
          {saved ? <p className="mt-3 text-sm text-ha-primary">{saved}</p> : null}
        </form>

        <div className="ha-panel">
          <h2 className="text-xl">Domači strežnik</h2>
          <p className="mt-2 text-sm leading-6 text-ha-muted">
            Celotnega projekta ne rabiš. Na strežnik gre <strong>ena datoteka</strong>, ki poišče
            releje (Shelly, Tasmota) v omrežju. Aplikacija jih potem krmili od kjerkoli.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-ha-muted">
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
            className="mt-4 w-full ha-input"
          />
          <input
            value={state.settings.bridgeToken}
            onChange={(event) => updateSettings({ bridgeToken: event.target.value })}
            placeholder="Žeton iz token.txt"
            className="mt-3 w-full ha-input"
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
              className="ha-btn"
            >
              Preizkusi povezavo
            </button>
          </div>
          {bridgeStatus ? <p className="mt-3 text-sm text-ha-muted">{bridgeStatus}</p> : null}
        </div>

        <div className="ha-panel">
          <h2 className="text-xl">Tuya / Smart Life</h2>
          <p className="mt-2 text-sm leading-6 text-ha-muted">
            Releji in senzorji iz Tuya aplikacije niso vidni na WiFi skenu. Poveži isti račun prek
            Tuya oblaka. Štiri stikala v Tuya app so na spletni strani ena naprava — v tej
            aplikaciji jih razdeli na štiri kvadratke. Temperaturni senzor (notri ali zunaj) se
            uvozi kot kartica s °C.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-ha-muted">
            <li>
              Odpri{" "}
              <a className="text-ha-primary underline" href="https://iot.tuya.com" target="_blank" rel="noreferrer">
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
            className="mt-4 w-full ha-input"
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
            className="mt-3 w-full ha-input"
          />
          <input
            type="password"
            value={state.settings.tuyaSecret}
            onChange={(event) => updateSettings({ tuyaSecret: event.target.value })}
            placeholder="Access Secret"
            className="mt-3 w-full ha-input"
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
            className="mt-4 ha-btn"
          >
            Preizkusi Tuya
          </button>
          {tuyaStatus ? <p className="mt-3 text-sm text-ha-muted">{tuyaStatus}</p> : null}
        </div>

        <div className="ha-panel">
          <h2 className="text-xl">Home Assistant</h2>
          <input
            value={state.settings.haUrl}
            onChange={(event) => updateSettings({ haUrl: event.target.value })}
            placeholder="https://tvoje-ha.ui.nabu.casa"
            className="mt-4 w-full ha-input"
          />
          <input
            type="password"
            value={state.settings.haToken}
            onChange={(event) => updateSettings({ haToken: event.target.value })}
            placeholder="Long-lived access token"
            className="mt-3 w-full ha-input"
          />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!roomName.trim()) return;
            addRoom(roomName.trim());
            setRoomName("");
          }}
          className="ha-panel"
        >
          <h2 className="text-xl">Prostori</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.rooms.map((room) => (
              <span key={room.id} className="rounded-full bg-ha-bg px-3 py-1 text-sm">
                {room.name}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Nov prostor"
              className="flex-1 ha-input"
            />
            <button type="submit" className="ha-btn-ghost">
              Dodaj
            </button>
          </div>
        </form>

        <div className="ha-panel">
          <h2 className="text-xl">Varnostna kopija in sinhronizacija</h2>
          <p className="mt-2 text-sm text-ha-muted">
            Plošča se shrani na strežnik, da jo vidi tudi telefon. Najprej na računalniku tapni
            Pošlji na telefon, potem na telefonu Naloži s strežnika.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void pushToCloud()}
              disabled={syncing}
              className="ha-btn"
            >
              {syncing ? "Pošiljam…" : "Pošlji na telefon"}
            </button>
            <button
              type="button"
              onClick={() => void pullFromCloud()}
              disabled={syncing}
              className="ha-btn-ghost disabled:opacity-50"
            >
              Naloži s strežnika
            </button>
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
              className="ha-btn-ghost"
            >
              Izvozi
            </button>
            <label className="cursor-pointer ha-btn-ghost">
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
          className="ha-panel text-left text-ha-muted"
        >
          Ponastavi demo naprave in ploščo
        </button>
      </section>
    </div>
  );
}
