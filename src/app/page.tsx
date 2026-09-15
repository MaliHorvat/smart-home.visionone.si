"use client";

import { useEffect, useMemo, useState } from "react";
import { AddDeviceModal } from "@/components/AddDeviceModal";
import { ActionTile, DeviceTile, SceneTile } from "@/components/DeviceTile";
import { useHome } from "@/context/HomeContext";
import { cn, formatTime, isStandaloneApp } from "@/lib/utils";

export default function DashboardPage() {
  const { state, error, toggleDevice, runScene, updateDevice, allOff } = useHome();
  const [now, setNow] = useState(() => formatTime());
  const [adding, setAdding] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(formatTime()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isStandaloneApp()) return;
    if (localStorage.getItem("smarthome.installHint") === "0") return;
    setShowInstall(true);
  }, []);

  const devices = useMemo(() => {
    return [...state.devices].sort((a, b) => {
      if (Number(b.pinned) !== Number(a.pinned)) return Number(b.pinned) - Number(a.pinned);
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    });
  }, [state.devices]);

  const onCount = state.devices.filter((device) => device.state.on && device.kind !== "sensor").length;
  const columns = state.settings.tileColumns === 3 ? 3 : 4;

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sand-400">Hitri dostop</p>
          <h1 className="text-lg font-medium leading-tight">{state.settings.homeName}</h1>
        </div>
        <p className="text-sm tabular-nums text-sand-100/60">
          {now} · {onCount} vklopljenih
        </p>
      </div>

      {showInstall ? (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("smarthome.installHint", "0");
            setShowInstall(false);
          }}
          className="mb-2 rounded-2xl border border-sand-500/30 bg-sand-500/10 px-3 py-2 text-left text-xs text-sand-100/80"
        >
          Na telefonu: Deli → Na začetni zaslon. Potem se odpre kot aplikacija — tudi iz avta.
          <span className="mt-1 block text-sand-100/45">Tapni, da skriješ.</span>
        </button>
      ) : null}

      {error ? (
        <p className="mb-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <section className={cn("grid-tiles", columns === 3 && "grid-tiles-3")}>
        {devices.map((device) => (
          <DeviceTile
            key={device.id}
            device={device}
            onToggle={() => toggleDevice(device.id)}
            onPin={() => updateDevice(device.id, { pinned: !device.pinned })}
          />
        ))}
        {state.scenes.map((scene) => (
          <SceneTile key={scene.id} scene={scene} onRun={() => runScene(scene.id)} />
        ))}
        <ActionTile label="Vse off" detail="Brez ograje" onClick={allOff} />
        <ActionTile label="Dodaj" detail="Naprava" onClick={() => setAdding(true)} />
      </section>

      <p className="mt-3 text-center text-[10px] text-sand-100/40">
        Drži kvadratek, da ga pripneš na vrh — npr. ograja iz avta.
      </p>

      {adding ? <AddDeviceModal onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
