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

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    addDevice({
      name,
      address,
      integration,
      kind,
      roomId,
      entityId:
        integration === "homeassistant" || integration === "tuya" ? address : undefined,
      onPath: onPath || undefined,
      offPath: offPath || undefined,
      pinned,
      state: { on: false, reachable: true },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-panel"
      >
        <h2 className="text-2xl">Dodaj napravo</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm">
            Ime
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Integracija
            <select
              value={integration}
              onChange={(event) => setIntegration(event.target.value as Integration)}
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
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
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Tip
              <select
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as DeviceKind;
                  setKind(next);
                  if (next === "gate") setPinned(true);
                }}
                className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
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
                className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
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
                  className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                URL izklop
                <input
                  value={offPath}
                  onChange={(event) => setOffPath(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
                />
              </label>
            </>
          ) : null}
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="h-4 w-4 accent-glow-500"
            />
            Pripni na vrh plošče (hiter dostop, npr. ograja)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-3 text-sand-100/70">
            Prekliči
          </button>
          <button type="submit" className="rounded-2xl bg-glow-500 px-5 py-3 font-medium text-ink-950">
            Shrani
          </button>
        </div>
      </form>
    </div>
  );
}
