"use client";

import { FormEvent, useState } from "react";
import { useHome } from "@/context/HomeContext";

export default function ScenesPage() {
  const { state, runScene, addScene, addWidget } = useHome();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const actions = Object.entries(selected).map(([deviceId, on]) => ({ deviceId, on }));
    if (!name || actions.length === 0) return;
    addScene({ name, icon: "sparkles", actions });
    setName("");
    setSelected({});
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs text-ha-muted">Prizori</p>
      <h1 className="mt-2 text-3xl font-medium">Vklopi več naprav naenkrat</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="grid gap-3">
          {state.scenes.map((scene) => (
            <article
              key={scene.id}
              className="ha-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <h2 className="text-xl">{scene.name}</h2>
                <p className="text-sm text-ha-muted">{scene.actions.length} dejanj</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addWidget({ type: "scene", size: "sm", sceneId: scene.id })}
                  className="ha-btn-ghost px-4 py-2 text-sm"
                >
                  Na ploščo
                </button>
                <button
                  type="button"
                  onClick={() => runScene(scene.id)}
                  className="ha-btn px-4 py-2 text-sm"
                >
                  Zaženi
                </button>
              </div>
            </article>
          ))}
        </section>

        <form onSubmit={onSubmit} className="ha-panel">
          <h2 className="text-xl">Nov prizor</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ime prizora"
            className="ha-input mt-4 w-full"
          />
          <div className="mt-4 grid gap-2">
            {state.devices
              .filter((device) => device.kind !== "sensor")
              .map((device) => (
                <label key={device.id} className="flex items-center justify-between rounded-xl bg-ha-bg px-4 py-3">
                  <span>{device.name}</span>
                  <select
                    value={selected[device.id] === undefined ? "" : selected[device.id] ? "on" : "off"}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelected((current) => {
                        const next = { ...current };
                        if (!value) delete next[device.id];
                        else next[device.id] = value === "on";
                        return next;
                      });
                    }}
                    className="ha-input px-3 py-2"
                  >
                    <option value="">Preskoči</option>
                    <option value="on">Vklopi</option>
                    <option value="off">Izklopi</option>
                  </select>
                </label>
              ))}
          </div>
          <button type="submit" className="ha-btn mt-4 w-full">
            Shrani prizor
          </button>
        </form>
      </div>
    </div>
  );
}
