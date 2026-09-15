"use client";

import { FormEvent, useState } from "react";
import { DEVICE_ICON_OPTIONS, DeviceIcon } from "@/components/DeviceIcon";
import { useHome } from "@/context/HomeContext";
import { normalizeAutoOffSeconds } from "@/lib/storage";
import { TUYA_SWITCH_OPTIONS, tuyaChannelNumber } from "@/lib/tuya-channels";
import type { Device } from "@/lib/types";

export function EditDeviceModal({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  const { updateDevice, splitTuyaDevice, state } = useHome();
  const [name, setName] = useState(device.name);
  const [icon, setIcon] = useState(device.icon || device.kind);
  const [roomId, setRoomId] = useState(device.roomId);
  const [autoOff, setAutoOff] = useState(
    device.autoOffSeconds ? String(device.autoOffSeconds) : "",
  );
  const siblingCount = state.devices.filter(
    (item) => item.integration === "tuya" && item.address === device.address,
  ).length;
  const [code, setCode] = useState(device.entityId || "switch_1");
  const [relays, setRelays] = useState(String(Math.max(4, siblingCount)));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const autoOffSeconds = normalizeAutoOffSeconds(autoOff);
    const nextCode = device.integration === "tuya" ? code || "switch_1" : device.entityId;
    updateDevice(device.id, {
      name: name.trim() || device.name,
      icon,
      roomId,
      autoOffSeconds,
      ...(device.integration === "tuya"
        ? { entityId: nextCode, channel: tuyaChannelNumber(nextCode || "switch_1") }
        : {}),
      ...(autoOffSeconds > 0 && device.state.on ? { lastUsed: Date.now() } : {}),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-panel"
      >
        <h2 className="text-2xl">Uredi napravo</h2>
        <label className="mt-5 grid gap-2 text-sm">
          Ime
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
        </label>
        <p className="mt-4 text-sm">Ikona</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {DEVICE_ICON_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setIcon(option.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-[10px] ${
                icon === option.id
                  ? "border-glow-500/50 bg-glow-500/15 text-glow-400"
                  : "border-white/10 bg-ink-900 text-sand-100/70"
              }`}
            >
              <DeviceIcon icon={option.id} size={18} />
              {option.label}
            </button>
          ))}
        </div>
        <label className="mt-4 grid gap-2 text-sm">
          Na plošči ugašeno po (sekunde)
          <input
            inputMode="numeric"
            value={autoOff}
            onChange={(event) => setAutoOff(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="npr. 5 — prazno, če ostane vklopljen"
            className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-sand-100/50">
          Če se rele sam izklopi, vpiši sekunde. Kvadratek potem ne ostane prižgan.
        </p>
        <label className="mt-4 grid gap-2 text-sm">
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
        {device.integration === "tuya" ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900 p-4">
            <p className="text-sm font-medium">Več relejev na isti napravi</p>
            <p className="mt-1 text-xs leading-5 text-sand-100/50">
              Tuya spletna stran kaže en modul. V Tuya app so ločena stikala. Tukaj jih razdeli na
              kvadratke.
            </p>
            <label className="mt-3 grid gap-2 text-sm">
              To stikalo
              <select
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-2xl border border-white/10 bg-ink-800 px-4 py-3"
              >
                {TUYA_SWITCH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Rele {option.replace("switch_", "")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 grid gap-2 text-sm">
              Število relejev
              <input
                inputMode="numeric"
                value={relays}
                onChange={(event) => setRelays(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="4"
                className="rounded-2xl border border-white/10 bg-ink-800 px-4 py-3"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const autoOffSeconds = normalizeAutoOffSeconds(autoOff);
                const nextCode = code || "switch_1";
                updateDevice(device.id, {
                  name: name.trim() || device.name,
                  icon,
                  roomId,
                  autoOffSeconds,
                  entityId: nextCode,
                  channel: tuyaChannelNumber(nextCode),
                });
                splitTuyaDevice(device.id, Number(relays) || 4);
                onClose();
              }}
              className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm"
            >
              Dodaj stikala na ploščo
            </button>
          </div>
        ) : null}
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
