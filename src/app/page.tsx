"use client";

import { Droplets, Menu, MoreVertical, Thermometer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddDeviceModal } from "@/components/AddDeviceModal";
import { ActionTile, DeviceTile, SceneTile } from "@/components/DeviceTile";
import { EditDeviceModal } from "@/components/EditDeviceModal";
import { RoomIcon } from "@/components/RoomIcon";
import { useHome } from "@/context/HomeContext";
import type { Device } from "@/lib/types";
import { realDeviceCount } from "@/lib/storage";
import { cn, formatTime, isStandaloneApp } from "@/lib/utils";

export default function DashboardPage() {
  const {
    state,
    error,
    toggleDevice,
    runScene,
    updateDevice,
    allOff,
    pullFromCloud,
    refreshDevice,
    syncing,
  } = useHome();
  const [now, setNow] = useState(() => formatTime());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Device | null>(null);
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

  useEffect(() => {
    const sensors = state.devices.filter(
      (device) => device.kind === "sensor" && device.integration === "tuya",
    );
    if (!sensors.length) return;
    const tick = () => {
      for (const sensor of sensors) void refreshDevice(sensor.id);
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, [refreshDevice, state.devices]);

  const devices = useMemo(() => {
    return [...state.devices].sort((a, b) => {
      if (Number(b.pinned) !== Number(a.pinned)) return Number(b.pinned) - Number(a.pinned);
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    });
  }, [state.devices]);

  const sensors = devices.filter((device) => device.kind === "sensor" || device.kind === "thermostat");
  const pinned = devices.filter((device) => device.pinned);
  const roomGroups = state.rooms
    .map((room) => ({
      room,
      items: devices.filter((device) => !device.pinned && device.roomId === room.id),
    }))
    .filter((group) => group.items.length);
  const unassigned = devices.filter(
    (device) => !device.pinned && !state.rooms.some((room) => room.id === device.roomId),
  );
  const columns = state.settings.tileColumns === 3;
  const onCount = state.devices.filter((device) => device.state.on && device.kind !== "sensor").length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <header
        className={cn(
          "mb-3 flex items-center justify-between gap-3 rounded-2xl px-2 py-2",
          editing ? "bg-ha-header text-white" : "",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Menu size={20} className={editing ? "text-white/80" : "text-ha-muted"} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium leading-tight">{state.settings.homeName}</h1>
            <p className={cn("text-xs", editing ? "text-white/70" : "text-ha-muted")}>
              {now} · {onCount} vklopljenih
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              editing ? "bg-white text-ha-header" : "bg-white text-ha-primary shadow-panel",
            )}
          >
            {editing ? "Končaj" : "Uredi"}
          </button>
          <MoreVertical size={18} className={editing ? "text-white/70" : "text-ha-muted"} />
        </div>
      </header>

      {sensors.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {sensors.map((sensor) => {
            const place = /zunaj|outdoor|vrt|garden|ext/i.test(sensor.name)
              ? " zunaj"
              : /notri|indoor|inside/i.test(sensor.name)
                ? " notri"
                : sensor.roomId === "outdoor"
                  ? " zunaj"
                  : "";
            return (
              <span
                key={sensor.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-ha-muted shadow-panel"
              >
                {sensor.state.temperature != null ? (
                  <>
                    <Thermometer size={12} />
                    {sensor.state.temperature.toFixed(1)}°{place}
                  </>
                ) : (
                  sensor.name
                )}
                {sensor.state.humidity != null ? (
                  <>
                    <Droplets size={12} className={sensor.state.temperature != null ? "ml-1" : ""} />
                    {sensor.state.humidity.toFixed(0)}%
                  </>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      {showInstall ? (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("smarthome.installHint", "0");
            setShowInstall(false);
          }}
          className="mb-3 rounded-xl bg-white px-3 py-2 text-left text-xs text-ha-muted shadow-panel"
        >
          Na telefonu: Deli → Na začetni zaslon. Potem se odpre kot aplikacija — tudi iz avta.
          <span className="mt-1 block text-ha-muted/70">Tapni, da skriješ.</span>
        </button>
      ) : null}

      {realDeviceCount(state) === 0 ? (
        <div className="mb-3 rounded-xl bg-white px-3 py-2 text-xs text-ha-muted shadow-panel">
          <p>
            Releja na tem zaslonu še ni. Na računalniku odpri Nastavitve in tapni{" "}
            <strong>Pošlji na telefon</strong>, potem tu:
          </p>
          <button
            type="button"
            onClick={() => void pullFromCloud()}
            disabled={syncing}
            className="ha-btn mt-2 px-3 py-1.5 text-sm"
          >
            {syncing ? "Nalagam…" : "Naloži s strežnika"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      ) : null}

      {pinned.length ? (
        <section
          className={cn(
            "mb-4 grid-tiles",
            columns && "grid-tiles-3",
            editing && "rounded-2xl border border-dashed border-slate-300 p-2",
          )}
        >
          {pinned.map((device) => (
            <DeviceTile
              key={device.id}
              device={device}
              onToggle={() => toggleDevice(device.id)}
              onPin={() => updateDevice(device.id, { pinned: !device.pinned })}
              onEdit={editing ? () => setSelected(device) : undefined}
            />
          ))}
        </section>
      ) : null}

      {[
        ...roomGroups,
        ...(unassigned.length
          ? [{ room: { id: "unassigned", name: "Ostalo", icon: "house" }, items: unassigned }]
          : []),
      ].map((group) => (
        <section key={group.room.id} className="mb-4">
          <div className="mb-2 flex items-center gap-2 px-1 text-ha-muted">
            <RoomIcon name={group.room.icon} className="h-4 w-4" />
            <p className="text-xs font-medium">{group.room.name}</p>
          </div>
          <div
            className={cn(
              "grid-tiles",
              columns && "grid-tiles-3",
              editing && "rounded-2xl border border-dashed border-slate-300 p-2",
            )}
          >
            {group.items.map((device) => (
              <DeviceTile
                key={device.id}
                device={device}
                onToggle={() => toggleDevice(device.id)}
                onPin={() => updateDevice(device.id, { pinned: !device.pinned })}
                onEdit={editing ? () => setSelected(device) : undefined}
              />
            ))}
            {editing ? (
              <ActionTile label="Dodaj" detail="Naprava" dashed onClick={() => setAdding(true)} />
            ) : null}
          </div>
        </section>
      ))}

      {state.scenes.length ? (
        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2 px-1 text-ha-muted">
            <p className="text-xs font-medium">Prizori</p>
          </div>
          <div className={cn("grid-tiles", columns && "grid-tiles-3")}>
            {state.scenes.map((scene) => (
              <SceneTile key={scene.id} scene={scene} onRun={() => runScene(scene.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {editing ? null : (
        <section className={cn("grid-tiles", columns && "grid-tiles-3")}>
          <ActionTile label="Vse off" detail="Brez ograje" onClick={allOff} />
          <ActionTile label="Dodaj" detail="Naprava" onClick={() => setAdding(true)} />
        </section>
      )}

      {editing && !roomGroups.length && !unassigned.length ? (
        <section className="rounded-2xl border border-dashed border-slate-300 p-2">
          <div className={cn("grid-tiles", columns && "grid-tiles-3")}>
            <ActionTile label="Dodaj" detail="Naprava" dashed onClick={() => setAdding(true)} />
          </div>
        </section>
      ) : null}

      <p className="mt-3 text-center text-[10px] text-ha-muted">
        {editing
          ? "Tapni kartico za ime, ikono, timer ali razdelitev relejev."
          : "Drži kartico, da jo pripneš na vrh — npr. ograja iz avta."}
      </p>

      {adding ? <AddDeviceModal onClose={() => setAdding(false)} /> : null}
      {selected ? <EditDeviceModal device={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
