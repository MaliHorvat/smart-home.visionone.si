"use client";

import {
  Car,
  Clapperboard,
  DoorOpen,
  Droplets,
  Fan,
  Fence,
  Flame,
  Home,
  Lamp,
  Lightbulb,
  Lock,
  Plug,
  Power,
  Speaker,
  Sun,
  Thermometer,
  ToggleLeft,
  Trees,
  Tv,
  Utensils,
  Wifi,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Device } from "@/lib/types";

export const DEVICE_ICON_MAP: Record<string, LucideIcon> = {
  light: Lightbulb,
  lamp: Lamp,
  switch: ToggleLeft,
  plug: Plug,
  power: Power,
  gate: Fence,
  door: DoorOpen,
  lock: Lock,
  fan: Fan,
  wind: Wind,
  flame: Flame,
  sun: Sun,
  tree: Trees,
  tv: Tv,
  speaker: Speaker,
  sensor: Thermometer,
  thermostat: Thermometer,
  wifi: Wifi,
  car: Car,
  home: Home,
  water: Droplets,
  kitchen: Utensils,
  other: Lightbulb,
};

export const DEVICE_ICON_OPTIONS = [
  { id: "light", label: "Luč" },
  { id: "lamp", label: "Svetilka" },
  { id: "switch", label: "Stikalo" },
  { id: "plug", label: "Vtičnica" },
  { id: "power", label: "Napajanje" },
  { id: "gate", label: "Ograja" },
  { id: "door", label: "Vrata" },
  { id: "lock", label: "Ključavnica" },
  { id: "fan", label: "Ventilator" },
  { id: "flame", label: "Ogrevanje" },
  { id: "sun", label: "Sonce" },
  { id: "tree", label: "Zunaj" },
  { id: "tv", label: "TV" },
  { id: "speaker", label: "Zvočnik" },
  { id: "sensor", label: "Senzor" },
  { id: "car", label: "Avto" },
  { id: "home", label: "Dom" },
  { id: "water", label: "Voda" },
  { id: "kitchen", label: "Kuhinja" },
  { id: "wifi", label: "WiFi" },
] as const;

export function DeviceIcon({
  kind,
  icon,
  scene,
  size = 22,
}: {
  kind?: Device["kind"];
  icon?: string;
  scene?: boolean;
  size?: number;
}) {
  const Icon = scene
    ? Clapperboard
    : DEVICE_ICON_MAP[icon || ""] || DEVICE_ICON_MAP[kind || "other"] || Lightbulb;
  return <Icon size={size} strokeWidth={1.75} />;
}
