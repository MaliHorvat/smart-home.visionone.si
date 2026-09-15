"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock3,
  DoorClosed,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DeviceIcon } from "@/components/DeviceIcon";
import { useHome } from "@/context/HomeContext";
import { KIND_LABELS } from "@/lib/storage";
import type { Widget } from "@/lib/types";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { RoomIcon } from "./RoomIcon";
import { ToggleSwitch } from "./ToggleSwitch";

export function WidgetCard({ widget, editing }: { widget: Widget; editing: boolean }) {
  const { state, toggleDevice, runScene, removeWidget, moveWidget } = useHome();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (widget.type !== "clock") return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [widget.type]);

  const device = state.devices.find((item) => item.id === widget.deviceId);
  const scene = state.scenes.find((item) => item.id === widget.sceneId);
  const room = state.rooms.find((item) => item.id === widget.roomId);
  const roomDevices = state.devices.filter((item) => item.roomId === widget.roomId);
  const onCount = state.devices.filter((item) => item.state.on).length;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-ink-800/90 p-5 shadow-panel",
        `span-${widget.size}`,
      )}
    >
      {editing ? (
        <div className="absolute right-3 top-3 flex gap-1">
          <button
            type="button"
            className="rounded-lg bg-white/10 p-1"
            onClick={() => moveWidget(widget.id, "left")}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/10 p-1"
            onClick={() => moveWidget(widget.id, "right")}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500/20 p-1 text-red-200"
            onClick={() => removeWidget(widget.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}

      {widget.type === "clock" ? (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sand-400">Zdaj</p>
          <p className="mt-3 flex items-center gap-2 text-4xl font-medium">
            <Clock3 className="text-sand-400" />
            {formatTime(now)}
          </p>
          <p className="mt-2 capitalize text-sand-100/70">{formatDate(now)}</p>
        </div>
      ) : null}

      {widget.type === "status" ? (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sand-400">Stanje hiše</p>
          <p className="mt-3 text-4xl font-medium">{onCount}</p>
          <p className="text-sand-100/70">vklopljenih naprav od {state.devices.length}</p>
        </div>
      ) : null}

      {widget.type === "device" && device ? (
        <div className="flex h-full items-start justify-between gap-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-glow-400">
              <DeviceIcon kind={device.kind} size={18} />
            </div>
            <h3 className="mt-4 text-xl">{device.name}</h3>
            <p className="text-sm text-sand-100/60">{KIND_LABELS[device.kind]}</p>
            {typeof device.state.temperature === "number" ? (
              <p className="mt-3 text-2xl">{device.state.temperature.toFixed(1)}°</p>
            ) : null}
          </div>
          {device.kind !== "sensor" ? (
            <ToggleSwitch checked={device.state.on} onChange={() => toggleDevice(device.id)} />
          ) : null}
        </div>
      ) : null}

      {widget.type === "scene" && scene ? (
        <button
          type="button"
          onClick={() => runScene(scene.id)}
          className="flex h-full w-full flex-col items-start text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sand-500/20 text-sand-400">
            {scene.icon === "door-closed" ? <DoorClosed size={18} /> : <Clapperboard size={18} />}
          </span>
          <span className="mt-4 text-xl">{scene.name}</span>
          <span className="text-sm text-sand-100/60">Zaženi prizor</span>
        </button>
      ) : null}

      {widget.type === "room" && room ? (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-glow-400">
                <RoomIcon name={room.icon} />
              </span>
              <div>
                <h3 className="text-xl">{room.name}</h3>
                <p className="text-sm text-sand-100/60">{roomDevices.length} naprav</p>
              </div>
            </div>
            <Sparkles className="text-sand-400" size={18} />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {roomDevices.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleDevice(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2 text-left",
                  item.state.on ? "bg-glow-500/15" : "bg-white/5",
                )}
              >
                <span>{item.name}</span>
                <span className="text-xs text-sand-100/60">{item.state.on ? "ON" : "OFF"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
