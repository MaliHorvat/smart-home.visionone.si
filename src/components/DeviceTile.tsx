"use client";

import { PointerEvent, useRef } from "react";
import { Pin } from "lucide-react";
import { DeviceIcon } from "@/components/DeviceIcon";
import type { Device, Scene } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusLabel(device: Device) {
  if (device.kind === "sensor" || device.kind === "thermostat") {
    return typeof device.state.temperature === "number"
      ? `${device.state.temperature.toFixed(0)}°`
      : "—";
  }
  if (device.kind === "gate") return device.state.on ? "Odprto" : "Zaprto";
  return device.state.on ? "ON" : "OFF";
}

export function DeviceTile({
  device,
  onToggle,
  onPin,
}: {
  device: Device;
  onToggle: () => void;
  onPin: () => void;
}) {
  const held = useRef(false);
  const timer = useRef<number | null>(null);

  function clearTimer() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onPin();
    }, 450);
  }

  function onClick() {
    if (held.current) return;
    if (device.kind === "sensor") return;
    onToggle();
  }

  const active = device.state.on && device.kind !== "sensor";

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onClick={onClick}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "relative flex aspect-square select-none flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 text-center transition active:scale-95",
        active
          ? "border-glow-500/40 bg-glow-500/20 text-white"
          : "border-white/10 bg-ink-800 text-sand-100/80",
        device.pinned && "ring-1 ring-sand-400/70",
      )}
    >
      {device.pinned ? (
        <Pin size={10} className="absolute right-1.5 top-1.5 text-sand-400" />
      ) : null}
      <span className={cn(active ? "text-glow-400" : "text-sand-100/55")}>
        <DeviceIcon kind={device.kind} size={22} />
      </span>
      <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
        {device.name}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-sand-100/45">
        {statusLabel(device)}
      </span>
    </button>
  );
}

export function SceneTile({ scene, onRun }: { scene: Scene; onRun: () => void }) {
  return (
    <button
      type="button"
      onClick={onRun}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-sand-500/25 bg-sand-500/10 px-1.5 text-center text-sand-100/80 transition active:scale-95"
    >
      <span className="text-sand-400">
        <DeviceIcon scene size={22} />
      </span>
      <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
        {scene.name}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-sand-100/45">Prizor</span>
    </button>
  );
}

export function ActionTile({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 bg-white/5 px-1.5 text-center text-sand-100/80 transition active:scale-95"
    >
      <span className="text-[22px] leading-none text-sand-400">{label === "Dodaj" ? "+" : "⏻"}</span>
      <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-sand-100/45">{detail}</span>
    </button>
  );
}
