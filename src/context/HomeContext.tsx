"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { bridgeHealth, bridgeInventory, bridgeScan, readDevice, scanSubnet, setDevicePower } from "@/lib/devices";
import {
  createDefaultState,
  hashPin,
  loadState,
  saveState,
  uid,
} from "@/lib/storage";
import { buzz } from "@/lib/utils";
import type {
  Device,
  DiscoveredDevice,
  HomeState,
  Scene,
  Settings,
  Widget,
} from "@/lib/types";

const UNLOCK_KEY = "smarthome.unlocked";

interface HomeContextValue {
  ready: boolean;
  unlocked: boolean;
  state: HomeState;
  error: string | null;
  scanning: boolean;
  scanProgress: { done: number; total: number };
  discovered: DiscoveredDevice[];
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setPin: (pin: string) => Promise<void>;
  addRoom: (name: string) => void;
  addDevice: (device: Omit<Device, "id" | "state"> & { state?: Device["state"] }) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  toggleDevice: (id: string, on?: boolean, silent?: boolean) => Promise<void>;
  refreshDevice: (id: string) => Promise<void>;
  addScene: (scene: Omit<Scene, "id">) => void;
  runScene: (id: string) => Promise<void>;
  addWidget: (widget: Omit<Widget, "id">) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, direction: "left" | "right") => void;
  scanLocal: () => Promise<void>;
  scanViaBridge: () => Promise<void>;
  abortScan: () => void;
  testBridge: () => Promise<{ hostname: string; deviceCount: number; subnets: string[]; scannedAt: string | null }>;
  loadBridgeInventory: () => Promise<void>;
  addDiscovered: (items: DiscoveredDevice[]) => number;
  importHa: () => Promise<number>;
  resetDemo: () => void;
  notice: string | null;
  allOff: () => Promise<void>;
  importState: (next: HomeState) => void;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HomeState>(createDefaultState);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 254 });
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [abort, setAbort] = useState<AbortController | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 1600);
  }, []);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    const needsPin = Boolean(loaded.settings.pinHash);
    const already = sessionStorage.getItem(UNLOCK_KEY) === "1";
    setUnlocked(!needsPin || already);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [ready, state]);

  const patchState = useCallback((updater: (current: HomeState) => HomeState) => {
    setState((current) => updater(current));
  }, []);

  const unlock = useCallback(
    async (pin: string) => {
      const hash = await hashPin(pin);
      if (hash !== state.settings.pinHash) return false;
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
      return true;
    },
    [state.settings.pinHash],
  );

  const lock = useCallback(() => {
    sessionStorage.removeItem(UNLOCK_KEY);
    if (state.settings.pinHash) setUnlocked(false);
  }, [state.settings.pinHash]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    patchState((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  }, [patchState]);

  const setPin = useCallback(
    async (pin: string) => {
      const pinHash = pin ? await hashPin(pin) : "";
      updateSettings({ pinHash });
      if (pin) {
        sessionStorage.setItem(UNLOCK_KEY, "1");
        setUnlocked(true);
      }
    },
    [updateSettings],
  );

  const addRoom = useCallback(
    (name: string) => {
      patchState((current) => ({
        ...current,
        rooms: [...current.rooms, { id: uid("room"), name, icon: "house" }],
      }));
    },
    [patchState],
  );

  const addDevice = useCallback(
    (device: Omit<Device, "id" | "state"> & { state?: Device["state"] }) => {
      patchState((current) => ({
        ...current,
        devices: [
          ...current.devices,
          {
            ...device,
            id: uid("dev"),
            pinned: Boolean(device.pinned),
            state: device.state || { on: false, reachable: true },
          },
        ],
      }));
    },
    [patchState],
  );

  const updateDevice = useCallback(
    (id: string, patch: Partial<Device>) => {
      patchState((current) => ({
        ...current,
        devices: current.devices.map((device) =>
          device.id === id ? { ...device, ...patch, state: { ...device.state, ...patch.state } } : device,
        ),
      }));
    },
    [patchState],
  );

  const removeDevice = useCallback(
    (id: string) => {
      patchState((current) => ({
        ...current,
        devices: current.devices.filter((device) => device.id !== id),
        widgets: current.widgets.filter((widget) => widget.deviceId !== id),
        scenes: current.scenes.map((scene) => ({
          ...scene,
          actions: scene.actions.filter((action) => action.deviceId !== id),
        })),
      }));
    },
    [patchState],
  );

  const toggleDevice = useCallback(
    async (id: string, on?: boolean, silent?: boolean) => {
      const device = state.devices.find((item) => item.id === id);
      if (!device) return;
      const next = typeof on === "boolean" ? on : !device.state.on;
      setError(null);
      if (!silent) buzz();
      updateDevice(id, {
        lastUsed: Date.now(),
        state: { ...device.state, on: next },
      });
      if (!silent) {
        const label =
          device.kind === "gate"
            ? next
              ? `${device.name} odprta`
              : `${device.name} zaprta`
            : next
              ? `${device.name} vklopljena`
              : `${device.name} izklopljena`;
        flash(label);
      }
      try {
        const nextState = await setDevicePower(device, next, state.settings);
        updateDevice(id, { state: nextState });
      } catch (err) {
        updateDevice(id, { state: device.state });
        setError(err instanceof Error ? err.message : "Ukaza ni bilo mogoče izvesti.");
      }
    },
    [flash, state.devices, state.settings, updateDevice],
  );

  const refreshDevice = useCallback(
    async (id: string) => {
      const device = state.devices.find((item) => item.id === id);
      if (!device) return;
      try {
        const nextState = await readDevice(device, state.settings);
        updateDevice(id, { state: nextState });
      } catch {
        updateDevice(id, { state: { ...device.state, reachable: false } });
      }
    },
    [state.devices, state.settings, updateDevice],
  );

  const addScene = useCallback(
    (scene: Omit<Scene, "id">) => {
      patchState((current) => ({
        ...current,
        scenes: [...current.scenes, { ...scene, id: uid("scene") }],
      }));
    },
    [patchState],
  );

  const runScene = useCallback(
    async (id: string) => {
      const scene = state.scenes.find((item) => item.id === id);
      if (!scene) return;
      for (const action of scene.actions) {
        await toggleDevice(action.deviceId, action.on, true);
      }
      buzz(20);
      flash(`Prizor ${scene.name}`);
    },
    [flash, state.scenes, toggleDevice],
  );

  const addWidget = useCallback(
    (widget: Omit<Widget, "id">) => {
      patchState((current) => ({
        ...current,
        widgets: [...current.widgets, { ...widget, id: uid("w") }],
      }));
    },
    [patchState],
  );

  const removeWidget = useCallback(
    (id: string) => {
      patchState((current) => ({
        ...current,
        widgets: current.widgets.filter((widget) => widget.id !== id),
      }));
    },
    [patchState],
  );

  const moveWidget = useCallback(
    (id: string, direction: "left" | "right") => {
      patchState((current) => {
        const index = current.widgets.findIndex((widget) => widget.id === id);
        if (index < 0) return current;
        const next = [...current.widgets];
        const swapWith = direction === "left" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= next.length) return current;
        [next[index], next[swapWith]] = [next[swapWith], next[index]];
        return { ...current, widgets: next };
      });
    },
    [patchState],
  );

  const abortScan = useCallback(() => {
    abort?.abort();
    setScanning(false);
  }, [abort]);

  const scanLocal = useCallback(async () => {
    const controller = new AbortController();
    setAbort(controller);
    setScanning(true);
    setError(null);
    setDiscovered([]);
    try {
      const found = await scanSubnet(
        state.settings.subnet,
        (done, total, items) => {
          setScanProgress({ done, total });
          setDiscovered(items);
        },
        controller.signal,
      );
      setDiscovered(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Skeniranje ni uspelo.");
    } finally {
      setScanning(false);
    }
  }, [state.settings.subnet]);

  const scanViaBridge = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const found = await bridgeScan(state.settings);
      setDiscovered(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Most ni dosegljiv.");
    } finally {
      setScanning(false);
    }
  }, [state.settings]);

  const testBridge = useCallback(async () => {
    const data = await bridgeHealth(state.settings);
    return {
      hostname: data.hostname,
      deviceCount: data.deviceCount,
      subnets: data.subnets || [],
      scannedAt: data.scannedAt,
    };
  }, [state.settings]);

  const loadBridgeInventory = useCallback(async () => {
    if (!state.settings.bridgeUrl || !state.settings.bridgeToken) return;
    const data = await bridgeInventory(state.settings);
    setDiscovered(data.devices || []);
    if (data.scanning) setScanning(true);
  }, [state.settings]);

  const addDiscovered = useCallback(
    (items: DiscoveredDevice[]) => {
      const existing = new Set(state.devices.map((device) => device.address));
      const extra = items.filter((item) => !existing.has(item.ip));
      if (extra.length === 0) return 0;
      patchState((current) => {
        const have = new Set(current.devices.map((device) => device.address));
        const additions = extra
          .filter((item) => !have.has(item.ip))
          .map((item) => ({
            id: uid("dev"),
            name: item.name,
            roomId:
              item.kind === "gate"
                ? current.rooms.find((room) => room.id === "outdoor")?.id || current.rooms[0]?.id || "living"
                : current.rooms[0]?.id || "living",
            kind: item.kind,
            integration: item.integration,
            address: item.ip,
            pinned: item.kind === "gate",
            state: { on: false, reachable: true },
          }));
        return { ...current, devices: [...current.devices, ...additions] };
      });
      return extra.length;
    },
    [patchState, state.devices],
  );

  const importHa = useCallback(async () => {
    const response = await fetch("/api/ha/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        haUrl: state.settings.haUrl,
        token: state.settings.haToken,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Uvoz ni uspel.");
    const existing = new Set(state.devices.map((device) => device.entityId || device.address));
    const imported = (data.devices as Array<{
      entityId: string;
      name: string;
      kind: Device["kind"];
      on: boolean;
      reachable: boolean;
    }>).filter((item) => !existing.has(item.entityId));

    patchState((current) => ({
      ...current,
      devices: [
        ...current.devices,
        ...imported.map((item) => ({
          id: uid("ha"),
          name: item.name,
          roomId: current.rooms[0]?.id || "living",
          kind: item.kind,
          integration: "homeassistant" as const,
          address: item.entityId,
          entityId: item.entityId,
          state: { on: item.on, reachable: item.reachable },
        })),
      ],
    }));
    return imported.length;
  }, [patchState, state.devices, state.settings.haToken, state.settings.haUrl]);

  const resetDemo = useCallback(() => {
    const next = createDefaultState();
    next.settings = state.settings;
    setState(next);
    setDiscovered([]);
  }, [state.settings]);

  const allOff = useCallback(async () => {
    const targets = state.devices.filter(
      (device) =>
        device.state.on &&
        device.kind !== "sensor" &&
        device.kind !== "thermostat" &&
        device.kind !== "gate",
    );
    for (const device of targets) {
      await toggleDevice(device.id, false, true);
    }
    buzz(20);
    flash("Luči in vtičnice izklopljene");
  }, [flash, state.devices, toggleDevice]);

  const importState = useCallback((next: HomeState) => {
    setState({
      ...createDefaultState(),
      ...next,
      settings: { ...createDefaultState().settings, ...next.settings },
    });
    flash("Nastavitve so uvožene");
  }, [flash]);

  const value = useMemo(
    () => ({
      ready,
      unlocked,
      state,
      error,
      scanning,
      scanProgress,
      discovered,
      unlock,
      lock,
      updateSettings,
      setPin,
      addRoom,
      addDevice,
      updateDevice,
      removeDevice,
      toggleDevice,
      refreshDevice,
      addScene,
      runScene,
      addWidget,
      removeWidget,
      moveWidget,
      scanLocal,
      scanViaBridge,
      abortScan,
      testBridge,
      loadBridgeInventory,
      addDiscovered,
      importHa,
      resetDemo,
      notice,
      allOff,
      importState,
    }),
    [
      abortScan,
      addDevice,
      addDiscovered,
      addRoom,
      addScene,
      addWidget,
      allOff,
      discovered,
      error,
      importHa,
      importState,
      loadBridgeInventory,
      lock,
      moveWidget,
      notice,
      ready,
      refreshDevice,
      removeDevice,
      removeWidget,
      resetDemo,
      runScene,
      scanLocal,
      scanProgress,
      scanViaBridge,
      scanning,
      setPin,
      state,
      testBridge,
      toggleDevice,
      unlocked,
      unlock,
      updateDevice,
      updateSettings,
    ],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const value = useContext(HomeContext);
  if (!value) throw new Error("useHome mora biti znotraj HomeProvider.");
  return value;
}
