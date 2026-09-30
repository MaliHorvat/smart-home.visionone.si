"use client";

import { FormEvent, useState } from "react";
import { DEVICE_ICON_OPTIONS, DeviceIcon } from "@/components/DeviceIcon";
import { useHome } from "@/context/HomeContext";
import { normalizeAutoOffSeconds } from "@/lib/storage";
import { TUYA_SWITCH_OPTIONS, tuyaChannelNumber } from "@/lib/tuya-channels";
import type { Device } from "@/lib/types";

export function EditDeviceModal({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  const { updateDevice, splitTuyaDevice, state } = useHome();
  const [name, setName] = useState(device.name);
  const [icon, setIcon] = useState(device.icon || device.kind);
  const [roomId, setRoomId] = useState(device.roomId);
  const [autoOff, setAutoOff] = useState(
    device.autoOffSeconds ? String(device.autoOffSeconds) : "",
  );
  const siblingCount = state.devices.filter(
    (item) => item.integration === "tuya" && item.address === device.address,
  ).length;
  const [code, setCode] = useState(
    device.entityId || (device.kind === "sensor" ? "temp_current" : "switch_1"),
  );
  const [relays, setRelays] = useState(String(Math.max(4, siblingCount)));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const autoOffSeconds = normalizeAutoOffSeconds(autoOff);
    const nextCode =
      device.integration === "tuya"
        ? code || (device.kind === "sensor" ? "temp_current" : "switch_1")
        : device.entityId;
    updateDevice(device.id, {
      name: name.trim() || device.name,
      icon,
      roomId,
      autoOffSeconds,
      ...(device.integration === "tuya"
        ? { entityId: nextCode, channel: tuyaChannelNumber(nextCode || "switch_1") }
        : {}),
      ...(autoOffSeconds > 0 && device.state.on ? { lastUsed: Date.now() } : {}),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <form
        onSubmit={onSubmit}
        className="ha-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <h2 className="text-2xl">Uredi napravo</h2>
        <label className="mt-5 grid gap-2 text-sm">
          Ime
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ha-input"
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
                  ? "border-ha-primary bg-sky-50 text-ha-primary"
                  : "border-ha-line bg-ha-bg text-ha-muted"
              }`}
            >
              <DeviceIcon icon={option.id} size={18} />
              {option.label}
            </button>
          ))}
        </div>
        <label className="mt-4 grid gap-2 text-sm">
          Na plošči ugašeno po (sekunde)
          <input
            inputMode="numeric"
            value={autoOff}
            onChange={(event) => setAutoOff(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="npr. 5 — prazno, če ostane vklopljen"
            className="ha-input"
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-ha-muted">
          Če se rele sam izklopi, vpiši sekunde. Kvadratek potem ne ostane prižgan.
        </p>
        <label className="mt-4 grid gap-2 text-sm">
          Prostor
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="ha-input"
          >
            {state.rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        {device.integration === "tuya" ? (
          <div className="mt-4 rounded-2xl border border-ha-line bg-ha-bg p-4">
            <p className="text-sm font-medium">
              {device.kind === "sensor" || device.kind === "thermostat"
                ? "Tuya senzor"
                : "Več relejev na isti napravi"}
            </p>
            <p className="mt-1 text-xs leading-5 text-ha-muted">
              {device.kind === "sensor" || device.kind === "thermostat"
                ? "Za temperaturo zunaj ali notri izberi kodo, ki jo javi Tuya (običajno temp_current). Ime lahko vsebuje zunaj/notri."
                : "Tuya spletna stran kaže en modul. V Tuya app so ločena stikala. Tukaj jih razdeli na kvadratke."}
            </p>
            <label className="mt-3 grid gap-2 text-sm">
              Tuya koda
              <select
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="ha-input bg-white"
              >
                {(
                  device.kind === "sensor" || device.kind === "thermostat"
                    ? ["temp_current", "va_temperature", "temp_outdoor", "temp_indoor", "humidity"]
                    : [...TUYA_SWITCH_OPTIONS]
                )
                  .concat(code && !["temp_current", "va_temperature", "temp_outdoor", "temp_indoor", "humidity", ...TUYA_SWITCH_OPTIONS].includes(code) ? [code] : [])
                  .map((option) => (
                  <option key={option} value={option}>
                    {option.startsWith("switch_")
                      ? `Rele ${option.replace("switch_", "")}`
                      : option === "humidity"
                        ? "Vlažnost"
                        : option.includes("outdoor")
                          ? "Zunanja temperatura"
                          : option.includes("indoor")
                            ? "Notranja temperatura"
                            : "Temperatura"}
                  </option>
                ))}
              </select>
            </label>
            {device.kind !== "sensor" && device.kind !== "thermostat" ? (
              <>
            <label className="mt-3 grid gap-2 text-sm">
              Število relejev
              <input
                inputMode="numeric"
                value={relays}
                onChange={(event) => setRelays(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="4"
                className="ha-input bg-white"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const autoOffSeconds = normalizeAutoOffSeconds(autoOff);
                const nextCode = code || "switch_1";
                updateDevice(device.id, {
                  name: name.trim() || device.name,
                  icon,
                  roomId,
                  autoOffSeconds,
                  entityId: nextCode,
                  channel: tuyaChannelNumber(nextCode),
                });
                splitTuyaDevice(device.id, Number(relays) || 4);
                onClose();
              }}
              className="ha-btn-ghost mt-3 w-full text-sm"
            >
              Dodaj stikala na ploščo
            </button>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-ha-muted">
            Prekliči
          </button>
          <button type="submit" className="ha-btn px-5">
            Shrani
          </button>
        </div>
      </form>
    </div>
  );
}
