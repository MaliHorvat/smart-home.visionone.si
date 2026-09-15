import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HomeState } from "./types";

const FILE_NAME = "smarthome-state.json";
const KEY = "smarthome-state";

const memory = globalThis as typeof globalThis & { __smarthomeState?: HomeState };

function cacheGet() {
  return memory.__smarthomeState;
}

function cacheSet(state: HomeState) {
  memory.__smarthomeState = state;
}

function filePaths() {
  return [
    path.join(process.cwd(), "data", FILE_NAME),
    path.join(os.tmpdir(), FILE_NAME),
  ];
}

async function readJsonFile(file: string) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as HomeState;
  } catch {
    return null;
  }
}

async function writeJsonFile(file: string, state: HomeState) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(state), "utf8");
  return true;
}

async function readKv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { result?: string | HomeState | null };
  if (!data.result) return null;
  return typeof data.result === "string" ? (JSON.parse(data.result) as HomeState) : data.result;
}

async function writeKv(state: HomeState) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", KEY, JSON.stringify(state)]),
  });
  return response.ok;
}

async function readBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://blob.vercel-storage.com/${FILE_NAME}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as HomeState;
}

async function writeBlob(state: HomeState) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  const response = await fetch(`https://blob.vercel-storage.com/${FILE_NAME}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-content-type": "application/json",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "1",
    },
    body: JSON.stringify(state),
  });
  return response.ok;
}

async function readBridge(state?: HomeState | null) {
  const bridgeUrl = String(state?.settings.bridgeUrl || process.env.BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(state?.settings.bridgeToken || process.env.BRIDGE_TOKEN || "");
  if (!bridgeUrl || !token) return null;
  try {
    const response = await fetch(`${bridgeUrl}/state`, {
      headers: { "x-bridge-token": token },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: HomeState };
    return data.state || null;
  } catch {
    return null;
  }
}

async function writeBridge(state: HomeState) {
  const bridgeUrl = String(state.settings.bridgeUrl || process.env.BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(state.settings.bridgeToken || process.env.BRIDGE_TOKEN || "");
  if (!bridgeUrl || !token) return false;
  try {
    const response = await fetch(`${bridgeUrl}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-token": token,
      },
      body: JSON.stringify({ state }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function readCloudState(): Promise<HomeState | null> {
  const cached = cacheGet();
  if (cached) return cached;
  const kv = await readKv();
  if (kv) {
    cacheSet(kv);
    return kv;
  }
  const blob = await readBlob();
  if (blob) {
    cacheSet(blob);
    return blob;
  }
  for (const file of filePaths()) {
    const fromFile = await readJsonFile(file);
    if (fromFile) {
      cacheSet(fromFile);
      return fromFile;
    }
  }
  const fromBridge = await readBridge(null);
  if (fromBridge) {
    cacheSet(fromBridge);
    return fromBridge;
  }
  return null;
}

export async function writeCloudState(state: HomeState) {
  cacheSet(state);
  const results = await Promise.allSettled([
    writeKv(state),
    writeBlob(state),
    writeJsonFile(filePaths()[0], state),
    writeJsonFile(filePaths()[1], state),
    writeBridge(state),
  ]);
  return results.some((item) => item.status === "fulfilled" && item.value !== false);
}
