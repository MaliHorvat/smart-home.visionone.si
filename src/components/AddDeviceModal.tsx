"use client";

import { FormEvent, useState } from "react";
import { useHome } from "@/context/HomeContext";
import type { DeviceKind, Integration } from "@/lib/types";

export function AddDeviceModal({
  onClose,
  preset,
}: {
  onClose: () => void;
  preset?: { name?: string; address?: string; integration?: Integration; kind?: DeviceKind };
}) {
  const { state, addDevice } = useHome();
  const [name, setName] = useState(preset?.name || "");
  const [address, setAddress] = useState(preset?.address || "");
  const [integration, setIntegration] = useState<Integration>(preset?.integration || "shelly");
  const [kind, setKind] = useState<DeviceKind>(preset?.kind || "switch");
  const [roomId, setRoomId] = useState(state.rooms[0]?.id || "");
  const [onPath, setOnPath] = useState("");
  const [offPath, setOffPath] = useState("");
  const [pinned, setPinned] = useState(preset?.kind === "gate");
  const [tuyaCode, setTuyaCode] = useState(preset?.kind === "sensor" ? "temp_current" : "switch_1");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    addDevice({
      name,
      address,
      integration,
      kind,
      roomId,
      entityId:
        integration === "homeassistant"
          ? address
          : integration === "tuya"
            ? tuyaCode || (kind === "sensor" ? "temp_current" : "switch_1")
            : undefined,
      onPath: onPath || undefined,
      offPath: offPath || undefined,
      pinned,
      icon: kind,
      state: { on: false, reachable: true },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <form onSubmit={onSubmit} className="ha-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 className="text-2xl font-medium">Dodaj napravo</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm">
            Ime
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="ha-input"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Integracija
            <select
              value={integration}
              onChange={(event) => setIntegration(event.target.value as Integration)}
              className="ha-input"
            >
              <option value="shelly">Shelly</option>
              <option value="tasmota">Tasmota</option>
              <option value="tuya">Tuya / Smart Life</option>
              <option value="homeassistant">Home Assistant</option>
              <option value="generic">Generic HTTP</option>
              <option value="demo">Demo</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            {integration === "homeassistant"
              ? "Entity ID"
              : integration === "tuya"
                ? "Tuya Device ID"
                : "IP / naslov"}
            <input
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={
                integration === "homeassistant"
                  ? "light.dnevna"
                  : integration === "tuya"
                    ? "bfxxxxxxxx"
                    : "192.168.1.50"
              }
              className="ha-input"
            />
          </label>
          {integration === "tuya" ? (
            <label className="grid gap-2 text-sm">
              Tuya koda
              <input
                value={tuyaCode}
                onChange={(event) => setTuyaCode(event.target.value)}
                placeholder={kind === "sensor" ? "temp_current" : "switch_1"}
                className="ha-input"
              />
              <span className="text-xs text-ha-muted">
                Za temperaturni senzor vpiši temp_current. Za rele switch_1, switch_2 …
              </span>
            </label>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Tip
              <select
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as DeviceKind;
                  setKind(next);
                  if (next === "gate") setPinned(true);
                  if (next === "sensor") setTuyaCode("temp_current");
                }}
                className="ha-input"
              >
                <option value="light">Luč</option>
                <option value="switch">Stikalo</option>
                <option value="plug">Vtičnica</option>
                <option value="gate">Ograja / vrata</option>
                <option value="sensor">Senzor</option>
                <option value="thermostat">Termostat</option>
                <option value="other">Drugo</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Prostor
              <select
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                className="ha-input"
              >
                {state.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {integration === "generic" ? (
            <>
              <label className="grid gap-2 text-sm">
                URL vklop
                <input
                  value={onPath}
                  onChange={(event) => setOnPath(event.target.value)}
                  className="ha-input"
                />
              </label>
              <label className="grid gap-2 text-sm">
                URL izklop
                <input
                  value={offPath}
                  onChange={(event) => setOffPath(event.target.value)}
                  className="ha-input"
                />
              </label>
            </>
          ) : null}
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="h-4 w-4 accent-ha-primary"
            />
            Pripni na vrh plošče (hiter dostop, npr. ograja)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-ha-muted">
            Prekliči
          </button>
          <button type="submit" className="ha-btn px-5">
            Shrani
          </button>
        </div>
      </form>
    </div>
  );
}
