"use client";

import { FormEvent, useState } from "react";
import { DEVICE_ICON_OPTIONS, DeviceIcon } from "@/components/DeviceIcon";
import { useHome } from "@/context/HomeContext";
import type { Device } from "@/lib/types";

export function EditDeviceModal({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  const { updateDevice, state } = useHome();
  const [name, setName] = useState(device.name);
  const [icon, setIcon] = useState(device.icon || device.kind);
  const [roomId, setRoomId] = useState(device.roomId);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    updateDevice(device.id, { name: name.trim() || device.name, icon, roomId });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-panel"
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
