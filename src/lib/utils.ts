import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function isHttpsPage() {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function isLocalHost() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function buzz(ms = 14) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ni podprto */
  }
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}
