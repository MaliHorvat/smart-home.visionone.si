"use client";

import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddDeviceModal } from "@/components/AddDeviceModal";
import { DeviceIcon } from "@/components/DeviceIcon";
import { EditDeviceModal } from "@/components/EditDeviceModal";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { useHome } from "@/context/HomeContext";
import { INTEGRATION_LABELS, KIND_LABELS } from "@/lib/storage";
import type { Device } from "@/lib/types";

export default function DevicesPage() {
  const { state, toggleDevice, refreshDevice, removeDevice, addWidget } = useHome();
  const [open, setOpen] = useState(false);
  const [roomFilter, setRoomFilter] = useState("all");
  const [selected, setSelected] = useState<Device | null>(null);

  const devices =
    roomFilter === "all"
      ? state.devices
      : state.devices.filter((device) => device.roomId === roomFilter);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ha-muted">Naprave</p>
          <h1 className="mt-2 text-3xl font-medium">Vse inštalacije</h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ha-btn flex items-center gap-2"
        >
          <Plus size={16} />
          Dodaj napravo
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoomFilter("all")}
          className={`rounded-full px-4 py-2 text-sm ${roomFilter === "all" ? "bg-white shadow-panel" : "bg-transparent text-ha-muted"}`}
        >
          Vse
        </button>
        {state.rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setRoomFilter(room.id)}
            className={`rounded-full px-4 py-2 text-sm ${roomFilter === room.id ? "bg-white shadow-panel" : "bg-transparent text-ha-muted"}`}
          >
            {room.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {devices.map((device) => {
          const room = state.rooms.find((item) => item.id === device.roomId);
          return (
            <article
              key={device.id}
              className="ha-panel"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-ha-primary">
                    <DeviceIcon kind={device.kind} icon={device.icon} size={22} />
                  </span>
                  <div>
                    <h2 className="text-xl">{device.name}</h2>
                    <p className="text-sm text-ha-muted">
                      {room?.name} · {KIND_LABELS[device.kind]} · {INTEGRATION_LABELS[device.integration]}
                    </p>
                    <p className="mt-1 text-xs text-ha-muted">{device.address}</p>
                  </div>
                </div>
                {device.kind !== "sensor" ? (
                  <ToggleSwitch checked={device.state.on} onChange={() => toggleDevice(device.id)} />
                ) : (
                  <p className="text-2xl">
                    {device.state.temperature?.toFixed(1) ?? "—"}°
                    {typeof device.state.humidity === "number"
                      ? ` · ${device.state.humidity.toFixed(0)}%`
                      : ""}
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(device)}
                  className="flex items-center gap-2 rounded-xl bg-ha-bg px-3 py-2 text-sm"
                >
                  <Pencil size={14} />
                  Uredi
                </button>
                <button
                  type="button"
                  onClick={() => refreshDevice(device.id)}
                  className="flex items-center gap-2 rounded-xl bg-ha-bg px-3 py-2 text-sm"
                >
                  <RefreshCw size={14} />
                  Osveži
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addWidget({ type: "device", size: "sm", deviceId: device.id })
                  }
                  className="rounded-xl bg-ha-bg px-3 py-2 text-sm"
                >
                  Na ploščo
                </button>
                <button
                  type="button"
                  onClick={() => removeDevice(device.id)}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <Trash2 size={14} />
                  Odstrani
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {open ? <AddDeviceModal onClose={() => setOpen(false)} /> : null}
      {selected ? <EditDeviceModal device={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
