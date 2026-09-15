export type DeviceKind =
  | "light"
  | "switch"
  | "plug"
  | "sensor"
  | "thermostat"
  | "gate"
  | "other";

export type Integration =
  | "demo"
  | "shelly"
  | "tasmota"
  | "homeassistant"
  | "generic"
  | "bridge";

export type WidgetSize = "sm" | "md" | "lg";
export type WidgetType = "device" | "scene" | "room" | "clock" | "status";

export interface DeviceState {
  on: boolean;
  reachable: boolean;
  brightness?: number;
  temperature?: number;
  humidity?: number;
  lastSeen?: string;
  extra?: string;
}

export interface Device {
  id: string;
  name: string;
  roomId: string;
  kind: DeviceKind;
  integration: Integration;
  address: string;
  channel?: number;
  entityId?: string;
  onPath?: string;
  offPath?: string;
  pinned?: boolean;
  state: DeviceState;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
}

export interface SceneAction {
  deviceId: string;
  on: boolean;
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  actions: SceneAction[];
}

export interface Widget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  deviceId?: string;
  sceneId?: string;
  roomId?: string;
}

export interface Settings {
  homeName: string;
  ownerName: string;
  subnet: string;
  pinHash: string;
  haUrl: string;
  haToken: string;
  bridgeUrl: string;
  bridgeToken: string;
}

export interface HomeState {
  version: number;
  settings: Settings;
  rooms: Room[];
  devices: Device[];
  scenes: Scene[];
  widgets: Widget[];
}

export interface DiscoveredDevice {
  ip: string;
  name: string;
  integration: Integration;
  kind: DeviceKind;
  detail?: string;
}
