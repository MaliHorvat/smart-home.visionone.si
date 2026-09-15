import type { Device, DeviceKind, DiscoveredDevice, Integration, Settings } from "./types";

const PROBE_TIMEOUT = 1200;

async function fetchJson(url: string, init?: RequestInit, timeout = PROBE_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function detectLocalSubnet(): Promise<string | null> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("probe");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const ip = await new Promise<string | null>((resolve) => {
      const finish = (value: string | null) => {
        pc.close();
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 1500);
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate || "";
        const match = candidate.match(
          /((192\.168\.\d+)|(10\.\d+\.\d+)|(172\.(1[6-9]|2\d|3[0-1])\.\d+))\.\d+/,
        );
        if (match) {
          clearTimeout(timer);
          const parts = match[0].split(".");
          finish(parts.slice(0, 3).join("."));
        }
        if (!event.candidate) {
          clearTimeout(timer);
          finish(null);
        }
      };
    });
    return ip;
  } catch {
    return null;
  }
}

function kindFromName(name: string): DeviceKind {
  const value = name.toLowerCase();
  if (/(temp|klima|climate|thermo)/.test(value)) return "thermostat";
  if (/(sensor|motion|door|window)/.test(value)) return "sensor";
  if (/(plug|socket|vtic)/.test(value)) return "plug";
  if (/(gate|fence|ograja|vrata)/.test(value)) return "gate";
  if (/(light|lamp|luc|led|bulb)/.test(value)) return "light";
  if (/(switch|relay|stikal)/.test(value)) return "switch";
  return "other";
}

export async function probeHost(ip: string): Promise<DiscoveredDevice | null> {
  const targets: Array<{
    url: string;
    integration: Integration;
    parse: (data: Record<string, unknown>) => DiscoveredDevice | null;
  }> = [
    {
      url: `http://${ip}/shelly`,
      integration: "shelly",
      parse: (data) => ({
        ip,
        integration: "shelly",
        name: String(data.name || data.id || `Shelly ${ip}`),
        kind: kindFromName(String(data.name || data.type || "")),
        detail: String(data.model || data.type || "Shelly"),
      }),
    },
    {
      url: `http://${ip}/rpc/Shelly.GetDeviceInfo`,
      integration: "shelly",
      parse: (data) => ({
        ip,
        integration: "shelly",
        name: String(data.name || data.id || `Shelly ${ip}`),
        kind: kindFromName(String(data.name || data.model || "")),
        detail: String(data.model || "Shelly Gen2"),
      }),
    },
    {
      url: `http://${ip}/cm?cmnd=Status%200`,
      integration: "tasmota",
      parse: (data) => {
        const status = (data.Status || data) as Record<string, unknown>;
        const fn = Array.isArray(status.FriendlyName)
          ? String(status.FriendlyName[0])
          : String(status.FriendlyName || `Tasmota ${ip}`);
        return {
          ip,
          integration: "tasmota",
          name: fn,
          kind: kindFromName(fn),
          detail: String(status.Module || "Tasmota"),
        };
      },
    },
  ];

  for (const target of targets) {
    try {
      const data = (await fetchJson(target.url)) as Record<string, unknown>;
      const parsed = target.parse(data);
      if (parsed) return parsed;
    } catch {
      /* next target */
    }
  }
  return null;
}

export async function scanSubnet(
  subnet: string,
  onProgress?: (done: number, total: number, found: DiscoveredDevice[]) => void,
  signal?: AbortSignal,
) {
  const hosts = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
  const found: DiscoveredDevice[] = [];
  const batchSize = 24;
  let done = 0;

  for (let i = 0; i < hosts.length; i += batchSize) {
    if (signal?.aborted) break;
    const batch = hosts.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((ip) => probeHost(ip)));
    for (const item of results) {
      if (item) found.push(item);
    }
    done += batch.length;
    onProgress?.(done, hosts.length, [...found]);
  }

  return found;
}

export async function bridgeScan(settings: Settings) {
  if (!settings.bridgeUrl) throw new Error("Most ni nastavljen.");
  const payload = {
    bridgeUrl: settings.bridgeUrl,
    token: settings.bridgeToken,
    subnet: settings.subnet,
  };
  const start = await fetch("/api/bridge/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const startData = await start.json();
  if (!start.ok) throw new Error(startData.error || "Skeniranje prek mostu ni uspelo.");

  for (let i = 0; i < 40; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const response = await fetch("/api/bridge/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Most ni dosegljiv.");
    if (!data.scanning) return (data.devices || []) as DiscoveredDevice[];
  }
  throw new Error("Sken traja predolgo. Poskusi znova čez minuto.");
}

export async function bridgeHealth(settings: Settings) {
  const response = await fetch("/api/bridge/health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bridgeUrl: settings.bridgeUrl,
      token: settings.bridgeToken,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Most ni dosegljiv.");
  return data as {
    ok: boolean;
    scanning: boolean;
    deviceCount: number;
    subnets: string[];
    scannedAt: string | null;
    hostname: string;
  };
}

export async function bridgeInventory(settings: Settings) {
  const response = await fetch("/api/bridge/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bridgeUrl: settings.bridgeUrl,
      token: settings.bridgeToken,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Most ni dosegljiv.");
  return data as {
    scanning: boolean;
    devices: DiscoveredDevice[];
    subnets: string[];
    scannedAt: string | null;
    error: string | null;
  };
}

export async function readDevice(device: Device, settings: Settings) {
  if (device.integration === "demo") return device.state;

  if (settings.bridgeUrl && ["shelly", "tasmota", "bridge"].includes(device.integration)) {
    const response = await fetch("/api/bridge/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bridgeUrl: settings.bridgeUrl,
        token: settings.bridgeToken,
        device,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Status ni na voljo.");
    return data.state;
  }

  if (device.integration === "shelly") {
    try {
      const gen2 = await fetchJson(`http://${device.address}/rpc/Switch.GetStatus?id=${device.channel ?? 0}`);
      return {
        on: Boolean(gen2.output),
        reachable: true,
        lastSeen: new Date().toISOString(),
      };
    } catch {
      const gen1 = await fetchJson(`http://${device.address}/status`);
      const relay = Array.isArray(gen1.relays) ? gen1.relays[device.channel ?? 0] : null;
      return {
        on: Boolean(relay?.ison),
        reachable: true,
        lastSeen: new Date().toISOString(),
      };
    }
  }

  if (device.integration === "tasmota") {
    const data = await fetchJson(`http://${device.address}/cm?cmnd=Power`);
    const power = String(data.POWER || data.Power || "").toUpperCase();
    return {
      on: power === "ON",
      reachable: true,
      lastSeen: new Date().toISOString(),
    };
  }

  if (device.integration === "homeassistant" && settings.haUrl && device.entityId) {
    const response = await fetch("/api/ha/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        haUrl: settings.haUrl,
        token: settings.haToken,
        entityId: device.entityId,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Home Assistant ni dosegljiv.");
    return data.state;
  }

  return { ...device.state, reachable: false };
}

export async function setDevicePower(device: Device, on: boolean, settings: Settings) {
  if (device.integration === "demo") {
    return { ...device.state, on, reachable: true, lastSeen: new Date().toISOString() };
  }

  if (settings.bridgeUrl && ["shelly", "tasmota", "bridge", "generic"].includes(device.integration)) {
    const response = await fetch("/api/bridge/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bridgeUrl: settings.bridgeUrl,
        token: settings.bridgeToken,
        device,
        on,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ukaza ni bilo mogoče poslati.");
    return data.state;
  }

  if (device.integration === "shelly") {
    try {
      await fetchJson(`http://${device.address}/rpc/Switch.Set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.channel ?? 0, on }),
      });
    } catch {
      await fetchJson(
        `http://${device.address}/relay/${device.channel ?? 0}?turn=${on ? "on" : "off"}`,
      );
    }
    return { ...device.state, on, reachable: true, lastSeen: new Date().toISOString() };
  }

  if (device.integration === "tasmota") {
    await fetchJson(`http://${device.address}/cm?cmnd=Power%20${on ? "On" : "Off"}`);
    return { ...device.state, on, reachable: true, lastSeen: new Date().toISOString() };
  }

  if (device.integration === "generic") {
    const path = on ? device.onPath : device.offPath;
    if (!path) throw new Error("Manjkata URL-ja za vklop/izklop.");
    await fetchJson(path.startsWith("http") ? path : `http://${device.address}${path}`);
    return { ...device.state, on, reachable: true, lastSeen: new Date().toISOString() };
  }

  if (device.integration === "homeassistant") {
    const response = await fetch("/api/ha/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        haUrl: settings.haUrl,
        token: settings.haToken,
        entityId: device.entityId || device.address,
        on,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Home Assistant ukaza ni sprejel.");
    return data.state;
  }

  throw new Error("Ta integracija še nima ukaza za vklop.");
}
