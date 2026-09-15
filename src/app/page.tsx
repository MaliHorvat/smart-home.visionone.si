"use client";

import { useMemo, useState } from "react";
import { DeviceTile, SceneTile } from "@/components/DeviceTile";
import { useHome } from "@/context/HomeContext";
import { formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const { state, error, toggleDevice, runScene, updateDevice } = useHome();
  const [now] = useState(() => formatTime());

  const devices = useMemo(() => {
    return [...state.devices].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [state.devices]);

  const onCount = state.devices.filter((device) => device.state.on && device.kind !== "sensor").length;

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

      {error ? (
        <p className="mb-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <section className="grid-tiles">
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
      </section>

      <p className="mt-3 text-center text-[10px] text-sand-100/40">
        Drži kvadratek, da ga pripneš na vrh — npr. ograja iz avta.
      </p>
    </div>
  );
}
