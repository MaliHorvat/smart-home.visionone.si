import type { Device, HomeState, Room, Scene, Settings, Widget } from "./types";

export const STORAGE_KEY = "smarthome.v1";

export const KIND_LABELS: Record<Device["kind"], string> = {
  light: "Luč",
  switch: "Stikalo",
  plug: "Vtičnica",
  sensor: "Senzor",
  thermostat: "Termostat",
  gate: "Ograja",
  other: "Naprava",
};

export const INTEGRATION_LABELS: Record<Device["integration"], string> = {
  demo: "Demo",
  shelly: "Shelly",
  tasmota: "Tasmota",
  homeassistant: "Home Assistant",
  generic: "HTTP",
  bridge: "Lokalni most",
};

const defaultRooms: Room[] = [
  { id: "living", name: "Dnevna", icon: "sofa" },
  { id: "kitchen", name: "Kuhinja", icon: "cooking-pot" },
  { id: "bedroom", name: "Spalnica", icon: "bed" },
  { id: "bath", name: "Kopalnica", icon: "bath" },
  { id: "outdoor", name: "Zunanjost", icon: "trees" },
];

const demoGate: Device = {
  id: "demo-gate",
  name: "Ograja",
  roomId: "outdoor",
  kind: "gate",
  integration: "demo",
  address: "demo://gate",
  pinned: true,
  state: { on: false, reachable: true },
};

const demoDevices: Device[] = [
  demoGate,
  {
    id: "demo-main-light",
    name: "Stropna luč",
    roomId: "living",
    kind: "light",
    integration: "demo",
    address: "demo://living-light",
    state: { on: true, reachable: true, brightness: 80 },
  },
  {
    id: "demo-lamp",
    name: "Stoječa svetilka",
    roomId: "living",
    kind: "light",
    integration: "demo",
    address: "demo://floor-lamp",
    state: { on: false, reachable: true, brightness: 40 },
  },
  {
    id: "demo-plug",
    name: "TV vtičnica",
    roomId: "living",
    kind: "plug",
    integration: "demo",
    address: "demo://tv-plug",
    state: { on: true, reachable: true },
  },
  {
    id: "demo-kitchen",
    name: "Kuhinjski pult",
    roomId: "kitchen",
    kind: "light",
    integration: "demo",
    address: "demo://kitchen-light",
    state: { on: false, reachable: true },
  },
  {
    id: "demo-climate",
    name: "Dnevna klima",
    roomId: "living",
    kind: "sensor",
    integration: "demo",
    address: "demo://climate",
    state: { on: true, reachable: true, temperature: 22.4, humidity: 47 },
  },
];

const defaultScenes: Scene[] = [
  {
    id: "scene-movie",
    name: "Film",
    icon: "clapperboard",
    actions: [
      { deviceId: "demo-main-light", on: false },
      { deviceId: "demo-lamp", on: true },
      { deviceId: "demo-plug", on: true },
    ],
  },
  {
    id: "scene-away",
    name: "Odsoten",
    icon: "door-closed",
    actions: [
      { deviceId: "demo-main-light", on: false },
      { deviceId: "demo-lamp", on: false },
      { deviceId: "demo-plug", on: false },
      { deviceId: "demo-kitchen", on: false },
    ],
  },
];

const defaultWidgets: Widget[] = [
  { id: "w-clock", type: "clock", size: "md" },
  { id: "w-status", type: "status", size: "md" },
  { id: "w-main", type: "device", size: "md", deviceId: "demo-main-light" },
  { id: "w-lamp", type: "device", size: "sm", deviceId: "demo-lamp" },
  { id: "w-plug", type: "device", size: "sm", deviceId: "demo-plug" },
  { id: "w-scene-movie", type: "scene", size: "sm", sceneId: "scene-movie" },
  { id: "w-scene-away", type: "scene", size: "sm", sceneId: "scene-away" },
  { id: "w-living", type: "room", size: "lg", roomId: "living" },
];

const defaultSettings: Settings = {
  homeName: "Naš dom",
  ownerName: "",
  subnet: "192.168.1",
  pinHash: "",
  haUrl: "",
  haToken: "",
  bridgeUrl: "",
  bridgeToken: "",
  tileColumns: 4,
};

export function createDefaultState(): HomeState {
  return {
    version: 2,
    settings: defaultSettings,
    rooms: defaultRooms,
    devices: demoDevices,
    scenes: defaultScenes,
    widgets: defaultWidgets,
  };
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadState(): HomeState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as HomeState;
    if (!parsed?.version) return createDefaultState();
    const devices: Device[] = (parsed.devices || []).map((device) => ({
      ...device,
      pinned: Boolean(device.pinned),
    }));
    if (!devices.some((device) => device.id === "demo-gate" || device.kind === "gate")) {
      devices.unshift(demoGate);
    }
    return {
      ...createDefaultState(),
      ...parsed,
      version: 2,
      devices,
      settings: {
        ...defaultSettings,
        ...parsed.settings,
        tileColumns: parsed.settings?.tileColumns === 3 ? 3 : 4,
      },
    };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: HomeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`smarthome:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
