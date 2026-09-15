#!/usr/bin/env node
/**
 * Lokalni most za pametne naprave v LAN omrežju.
 * Zaženi na Raspberry Pi / NAS / vedno prižganem računalniku:
 *   BRIDGE_TOKEN=tvoj-skrivni-kljuc node bridge/server.mjs
 *
 * Nato most izpostavi prek Cloudflare Tunnel, Tailscale ali VPN,
 * da ga Vercel aplikacija lahko kliče po HTTPS.
 */
import http from "node:http";
import { Buffer } from "node:buffer";

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.BRIDGE_TOKEN || "";
const TIMEOUT_MS = 1200;

if (!TOKEN) {
  console.error("Nastavi BRIDGE_TOKEN pred zagonom mostu.");
  process.exit(1);
}

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    try {
      return { ok: response.ok, data: JSON.parse(text) };
    } catch {
      return { ok: response.ok, data: { raw: text } };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function probe(ip) {
  const targets = [
    [`http://${ip}/shelly`, "shelly"],
    [`http://${ip}/rpc/Shelly.GetDeviceInfo`, "shelly"],
    [`http://${ip}/cm?cmnd=Status%200`, "tasmota"],
  ];
  for (const [url, integration] of targets) {
    try {
      const result = await fetchJson(url);
      if (!result.ok) continue;
      const data = result.data || {};
      const status = data.Status || data;
      const name =
        data.name ||
        data.id ||
        (Array.isArray(status.FriendlyName) ? status.FriendlyName[0] : status.FriendlyName) ||
        `${integration} ${ip}`;
      return {
        ip,
        integration,
        name: String(name),
        kind: /light|lamp|luc|led/i.test(String(name)) ? "light" : "switch",
        detail: data.model || data.type || status.Module || integration,
      };
    } catch {
      /* next */
    }
  }
  return null;
}

async function scan(subnet = "192.168.1") {
  const found = [];
  const batchSize = 32;
  for (let start = 1; start <= 254; start += batchSize) {
    const jobs = [];
    for (let i = start; i < start + batchSize && i <= 254; i += 1) {
      jobs.push(probe(`${subnet}.${i}`));
    }
    const results = await Promise.all(jobs);
    for (const item of results) if (item) found.push(item);
  }
  return found;
}

async function control(device, on) {
  const channel = device.channel ?? 0;
  if (device.integration === "shelly") {
    try {
      await fetchJson(`http://${device.address}/rpc/Switch.Set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channel, on: Boolean(on) }),
      });
    } catch {
      await fetchJson(`http://${device.address}/relay/${channel}?turn=${on ? "on" : "off"}`);
    }
    return { on: Boolean(on), reachable: true, lastSeen: new Date().toISOString() };
  }
  if (device.integration === "tasmota") {
    await fetchJson(`http://${device.address}/cm?cmnd=Power%20${on ? "On" : "Off"}`);
    return { on: Boolean(on), reachable: true, lastSeen: new Date().toISOString() };
  }
  if (device.integration === "generic") {
    const path = on ? device.onPath : device.offPath;
    if (!path) throw new Error("Manjkata URL-ja.");
    await fetchJson(path.startsWith("http") ? path : `http://${device.address}${path}`);
    return { on: Boolean(on), reachable: true, lastSeen: new Date().toISOString() };
  }
  throw new Error("Nepodprta naprava.");
}

async function status(device) {
  if (device.integration === "shelly") {
    try {
      const gen2 = await fetchJson(`http://${device.address}/rpc/Switch.GetStatus?id=${device.channel ?? 0}`);
      if (gen2.ok) {
        return { on: Boolean(gen2.data.output), reachable: true, lastSeen: new Date().toISOString() };
      }
    } catch {
      /* gen1 */
    }
    const gen1 = await fetchJson(`http://${device.address}/status`);
    const relay = Array.isArray(gen1.data.relays) ? gen1.data.relays[device.channel ?? 0] : null;
    return { on: Boolean(relay?.ison), reachable: gen1.ok, lastSeen: new Date().toISOString() };
  }
  if (device.integration === "tasmota") {
    const result = await fetchJson(`http://${device.address}/cm?cmnd=Power`);
    const power = String(result.data.POWER || result.data.Power || "").toUpperCase();
    return { on: power === "ON", reachable: result.ok, lastSeen: new Date().toISOString() };
  }
  throw new Error("Status ni na voljo.");
}

function send(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-bridge-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  const token = req.headers["x-bridge-token"];
  if (token !== TOKEN) {
    send(res, 401, { error: "Neveljaven žeton mostu." });
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/health") {
      send(res, 200, { ok: true });
      return;
    }
    const body = req.method === "POST" ? await readBody(req) : {};
    if (req.method === "POST" && req.url === "/scan") {
      const devices = await scan(body.subnet || "192.168.1");
      send(res, 200, { devices });
      return;
    }
    if (req.method === "POST" && req.url === "/control") {
      const state = await control(body.device, body.on);
      send(res, 200, { state });
      return;
    }
    if (req.method === "POST" && req.url === "/status") {
      const state = await status(body.device);
      send(res, 200, { state });
      return;
    }
    send(res, 404, { error: "Neznana pot." });
  } catch (error) {
    send(res, 500, { error: error.message || "Napaka mostu." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SmartHome most posluša na :${PORT}`);
});
