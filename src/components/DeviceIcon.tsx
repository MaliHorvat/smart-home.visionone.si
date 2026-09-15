"use client";

import {
  Clapperboard,
  Fence,
  Lightbulb,
  Plug,
  Sparkles,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import type { Device } from "@/lib/types";

const ICONS: Record<Device["kind"] | "scene", LucideIcon> = {
  light: Lightbulb,
  switch: Lightbulb,
  plug: Plug,
  sensor: Thermometer,
  thermostat: Thermometer,
  gate: Fence,
  other: Lightbulb,
  scene: Sparkles,
};

export function DeviceIcon({
  kind,
  scene,
  size = 22,
}: {
  kind?: Device["kind"];
  scene?: boolean;
  size?: number;
}) {
  const Icon = scene ? Clapperboard : ICONS[kind || "other"];
  return <Icon size={size} strokeWidth={1.75} />;
}
