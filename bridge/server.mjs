#!/usr/bin/env node
/**
 * Samostojen most za domači strežnik — samo ta datoteka, brez celotnega projekta.
 *
 * Windows (PowerShell):
 *   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/MaliHorvat/smart-home.visionone.si/main/bridge/server.mjs" -OutFile server.mjs
 *   node server.mjs
 *
 * Linux:
 *   curl -fsSL -o server.mjs https://raw.githubusercontent.com/MaliHorvat/smart-home.visionone.si/main/bridge/server.mjs
 *   node server.mjs
 *
 * Nato v drugem oknu (da je dosegljiv od kjerkoli):
 *   cloudflared tunnel --url http://localhost:8787
 */
import dgram from "node:dgram";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(DIR, "token.txt");
const PORT = Number(process.env.PORT || 8787);
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT || 900);
const SCAN_EVERY_MS = Number(process.env.SCAN_INTERVAL_MS || 5 * 60 * 1000);

function loadOrCreateToken() {
  if (process.env.BRIDGE_TOKEN) return process.env.BRIDGE_TOKEN.trim();
  if (fs.existsSync(TOKEN_FILE)) return fs.readFileSync(TOKEN_FILE, "utf8").trim();
  const token = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  fs.writeFileSync(TOKEN_FILE, `${token}\n`, "utf8");
  console.log("Nov BRIDGE_TOKEN je shranjen v bridge/token.txt");
  console.log(token);
  return token;
}

const TOKEN = loadOrCreateToken();

function localSubnets() {
  const subnets = new Set();
  const extra = process.env.SUBNET;
  if (extra) subnets.add(extra.replace(/\.0\/24$/, "").replace(/\.$/, ""));
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.internal) continue;
      const family = String(addr.family);
      if (family === "IPv6" || family === "6") continue;
      const parts = addr.address.split(".");
      if (parts.length !== 4) continue;
      if (parts[0] === "169") continue;
      const privateRange =
        parts[0] === "10" ||
        (parts[0] === "192" && parts[1] === "168") ||
        (parts[0] === "172" && Number(parts[1]) >= 16 && Number(parts[1]) <= 31);
      if (privateRange) subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
    }
  }
  if (subnets.size === 0) subnets.add("192.168.1");
  return [...subnets];
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

function kindFromName(name) {
  const value = String(name).toLowerCase();
  if (/(gate|fence|ograja|vrata)/.test(value)) return "gate";
  if (/(plug|socket|vtic)/.test(value)) return "plug";
  if (/(light|lamp|luc|led|bulb)/.test(value)) return "light";
  if (/(temp|klima|thermo)/.test(value)) return "thermostat";
  return "switch";
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
        kind: kindFromName(name),
        detail: String(data.model || data.type || status.Module || integration),
      };
    } catch {
      /* next */
    }
  }
  return null;
}

function ssdpDiscover(ms = 1500) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const ips = new Set();
    const message = Buffer.from(
      [
        "M-SEARCH * HTTP/1.1",
        "HOST: 239.255.255.250:1900",
        'MAN: "ssdp:discover"',
        "MX: 1",
        "ST: ssdp:all",
        "",
        "",
      ].join("\r\n"),
    );
    socket.on("message", (msg, rinfo) => {
      if (rinfo?.address) ips.add(rinfo.address);
      const location = String(msg).match(/LOCATION:\s*http:\/\/([0-9.]+)/i);
      if (location) ips.add(location[1]);
    });
    socket.on("error", () => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve([...ips]);
    });
    socket.bind(() => {
      try {
        socket.addMembership("239.255.255.250");
        socket.setBroadcast(true);
        socket.send(message, 1900, "239.255.255.250");
      } catch {
        /* ignoriraj, če omrežje ne dovoli multicast */
      }
    });
    setTimeout(() => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve([...ips]);
    }, ms);
  });
}

async function scanSubnets(subnets) {
  const found = [];
  const seen = new Set();
  const ssdpIps = await ssdpDiscover();
  const priority = ssdpIps.filter((ip) => !ip.startsWith("127."));
  for (const ip of priority) {
    const item = await probe(ip);
    if (item && !seen.has(item.ip)) {
      seen.add(item.ip);
      found.push(item);
    }
  }

  const batchSize = 40;
  for (const subnet of subnets) {
    for (let start = 1; start <= 254; start += batchSize) {
      const jobs = [];
      for (let i = start; i < start + batchSize && i <= 254; i += 1) {
        const ip = `${subnet}.${i}`;
        if (seen.has(ip)) continue;
        jobs.push(probe(ip));
      }
      const results = await Promise.all(jobs);
      for (const item of results) {
        if (item && !seen.has(item.ip)) {
          seen.add(item.ip);
          found.push(item);
        }
      }
    }
  }
  return found;
}

const inventory = {
  scanning: false,
  devices: [],
  subnets: localSubnets(),
  scannedAt: null,
  error: null,
};

async function runScan(requestedSubnet) {
  if (inventory.scanning) return;
  inventory.scanning = true;
  inventory.error = null;
  const subnets = requestedSubnet ? [requestedSubnet] : localSubnets();
  inventory.subnets = subnets;
  console.log(`Skeniram podomrežja: ${subnets.join(", ")}`);
  try {
    inventory.devices = await scanSubnets(subnets);
    inventory.scannedAt = new Date().toISOString();
    console.log(`Najdenih naprav: ${inventory.devices.length}`);
  } catch (error) {
    inventory.error = error.message || "Sken ni uspel.";
    console.error(inventory.error);
  } finally {
    inventory.scanning = false;
  }
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
    const pathName = on ? device.onPath : device.offPath;
    if (!pathName) throw new Error("Manjkata URL-ja.");
    await fetchJson(pathName.startsWith("http") ? pathName : `http://${device.address}${pathName}`);
    return { on: Boolean(on), reachable: true, lastSeen: new Date().toISOString() };
  }
  throw new Error("Nepodprta naprava.");
}

async function status(device) {
  if (device.integration === "shelly") {
    try {
      const gen2 = await fetchJson(
        `http://${device.address}/rpc/Switch.GetStatus?id=${device.channel ?? 0}`,
      );
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
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-bridge-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(payload));
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

function routePath(url) {
  return (url || "/").split("?")[0];
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

  const urlPath = routePath(req.url);
  try {
    if (req.method === "GET" && urlPath === "/health") {
      send(res, 200, {
        ok: true,
        scanning: inventory.scanning,
        deviceCount: inventory.devices.length,
        subnets: inventory.subnets,
        scannedAt: inventory.scannedAt,
        hostname: os.hostname(),
      });
      return;
    }
    if (req.method === "GET" && urlPath === "/inventory") {
      send(res, 200, inventory);
      return;
    }

    const body = req.method === "POST" ? await readBody(req) : {};
    if (req.method === "POST" && urlPath === "/scan") {
      runScan(body.subnet).catch((error) => {
        inventory.error = error.message;
        inventory.scanning = false;
      });
      send(res, 202, { ok: true, scanning: true, subnets: inventory.subnets });
      return;
    }
    if (req.method === "POST" && urlPath === "/inventory") {
      send(res, 200, inventory);
      return;
    }
    if (req.method === "POST" && urlPath === "/control") {
      const state = await control(body.device, body.on);
      send(res, 200, { state });
      return;
    }
    if (req.method === "POST" && urlPath === "/status") {
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
  console.log(`SmartHome most posluša na http://0.0.0.0:${PORT}`);
  console.log(`LAN podomrežja: ${localSubnets().join(", ") || "neznano"}`);
  runScan();
  setInterval(() => runScan(), SCAN_EVERY_MS);
});
