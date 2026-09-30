"use client";

import { PointerEvent, useRef } from "react";
import { Pin } from "lucide-react";
import { DeviceIcon } from "@/components/DeviceIcon";
import type { Device, Scene } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusLabel(device: Device) {
  if (device.kind === "sensor" || device.kind === "thermostat") {
    const temp =
      typeof device.state.temperature === "number" ? `${device.state.temperature.toFixed(1)}°` : "";
    const humidity =
      typeof device.state.humidity === "number" ? `${device.state.humidity.toFixed(0)}%` : "";
    return [temp, humidity].filter(Boolean).join(" · ") || "—";
  }
  if (device.kind === "gate") return device.state.on ? "Odprto" : "Zaprto";
  return device.state.on ? "Vklopljeno" : "Izklopljeno";
}

function iconTone(device: Device, active: boolean) {
  if (device.kind === "sensor" || device.kind === "thermostat") {
    return "bg-sky-50 text-ha-primary";
  }
  if (device.kind === "gate") {
    return active ? "bg-ha-purpleSoft text-ha-purple" : "bg-slate-100 text-slate-400";
  }
  return active ? "bg-ha-onSoft text-amber-600" : "bg-slate-100 text-slate-400";
}

export function DeviceTile({
  device,
  onToggle,
  onPin,
  onEdit,
}: {
  device: Device;
  onToggle: () => void;
  onPin: () => void;
  onEdit?: () => void;
}) {
  const held = useRef(false);
  const timer = useRef<number | null>(null);

  function clearTimer() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    if (onEdit) return;
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onPin();
    }, 450);
  }

  function onClick() {
    if (held.current) return;
    if (onEdit) {
      onEdit();
      return;
    }
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
        "relative flex min-h-[72px] select-none items-center gap-3 rounded-xl bg-white px-3 py-3 text-left shadow-panel transition active:scale-[0.99]",
        onEdit && "ring-1 ring-dashed ring-ha-primary/50",
        device.pinned && "ring-1 ring-ha-primary/40",
      )}
    >
      {device.pinned ? (
        <Pin size={10} className="absolute right-2 top-2 text-ha-muted" />
      ) : null}
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", iconTone(device, active))}>
        <DeviceIcon kind={device.kind} icon={device.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-sm font-medium text-ha-text">{device.name}</span>
        <span className="mt-0.5 block text-xs text-ha-muted">{statusLabel(device)}</span>
      </span>
    </button>
  );
}

export function SceneTile({ scene, onRun }: { scene: Scene; onRun: () => void }) {
  return (
    <button
      type="button"
      onClick={onRun}
      className="relative flex min-h-[72px] items-center gap-3 rounded-xl bg-white px-3 py-3 text-left shadow-panel transition active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-ha-primary">
        <DeviceIcon scene size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-sm font-medium text-ha-text">{scene.name}</span>
        <span className="mt-0.5 block text-xs text-ha-muted">Prizor</span>
      </span>
    </button>
  );
}

export function ActionTile({
  label,
  detail,
  onClick,
  dashed,
}: {
  label: string;
  detail: string;
  onClick: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm text-ha-muted transition",
        dashed
          ? "border border-dashed border-ha-primary bg-transparent"
          : "bg-white shadow-panel",
      )}
    >
      <span className="text-lg leading-none">{label === "Dodaj" ? "+" : "⏻"}</span>
      <span>
        <span className="block font-medium text-ha-text">{label}</span>
        <span className="block text-xs">{detail}</span>
      </span>
    </button>
  );
}
