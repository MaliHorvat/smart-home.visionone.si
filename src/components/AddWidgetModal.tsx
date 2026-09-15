"use client";

import { FormEvent, useMemo, useState } from "react";
import { useHome } from "@/context/HomeContext";
import type { WidgetSize, WidgetType } from "@/lib/types";

export function AddWidgetModal({ onClose }: { onClose: () => void }) {
  const { state, addWidget } = useHome();
  const [type, setType] = useState<WidgetType>("device");
  const [size, setSize] = useState<WidgetSize>("md");
  const [deviceId, setDeviceId] = useState(state.devices[0]?.id || "");
  const [sceneId, setSceneId] = useState(state.scenes[0]?.id || "");
  const [roomId, setRoomId] = useState(state.rooms[0]?.id || "");

  const canSubmit = useMemo(() => {
    if (type === "device") return Boolean(deviceId);
    if (type === "scene") return Boolean(sceneId);
    if (type === "room") return Boolean(roomId);
    return true;
  }, [deviceId, roomId, sceneId, type]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    addWidget({
      type,
      size,
      deviceId: type === "device" ? deviceId : undefined,
      sceneId: type === "scene" ? sceneId : undefined,
      roomId: type === "room" ? roomId : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-panel"
      >
        <h2 className="text-2xl">Dodaj ploščico</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm">
            Tip
            <select
              value={type}
              onChange={(event) => setType(event.target.value as WidgetType)}
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            >
              <option value="device">Naprava</option>
              <option value="scene">Prizor</option>
              <option value="room">Prostor</option>
              <option value="clock">Ura</option>
              <option value="status">Stanje hiše</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            Velikost
            <select
              value={size}
              onChange={(event) => setSize(event.target.value as WidgetSize)}
              className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
            >
              <option value="sm">Majhna</option>
              <option value="md">Srednja</option>
              <option value="lg">Široka</option>
            </select>
          </label>
          {type === "device" ? (
            <label className="grid gap-2 text-sm">
              Naprava
              <select
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
              >
                {state.devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {type === "scene" ? (
            <label className="grid gap-2 text-sm">
              Prizor
              <select
                value={sceneId}
                onChange={(event) => setSceneId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-3"
              >
                {state.scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {type === "room" ? (
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
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-3 text-sand-100/70">
            Prekliči
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-glow-500 px-5 py-3 font-medium text-ink-950 disabled:opacity-40"
          >
            Dodaj
          </button>
        </div>
      </form>
    </div>
  );
}
