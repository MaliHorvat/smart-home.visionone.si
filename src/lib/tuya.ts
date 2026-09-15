import crypto from "node:crypto";
import type { DeviceKind } from "./types";
import {
  isSwitchDp,
  sortSwitchCodes,
  tuyaChannelName,
  tuyaChannelNumber,
  tuyaIsOn,
  tuyaKind,
  tuyaSwitchCode,
  tuyaSwitchCodes,
} from "./tuya-channels";

export {
  tuyaChannelName,
  tuyaChannelNumber,
  tuyaIsOn,
  tuyaKind,
  tuyaSwitchCode,
  tuyaSwitchCodes,
};

export const TUYA_HOSTS: Record<string, string> = {
  eu: "https://openapi.tuyaeu.com",
  us: "https://openapi.tuyaus.com",
  cn: "https://openapi.tuya.cn",
  in: "https://openapi.tuyain.com",
};

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex").toUpperCase();
}

function signedPath(path: string) {
  const qIndex = path.indexOf("?");
  if (qIndex < 0) return path;
  const pathname = path.slice(0, qIndex);
  const query = path
    .slice(qIndex + 1)
    .split("&")
    .filter(Boolean)
    .sort((a, b) => a.split("=")[0].localeCompare(b.split("=")[0]))
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
}

function signRequest(params: {
  clientId: string;
  secret: string;
  accessToken?: string;
  method: string;
  path: string;
  body?: string;
  t: string;
}) {
  const path = signedPath(params.path);
  const bodyHash = sha256Hex(params.body || "");
  const stringToSign = `${params.method}\n${bodyHash}\n\n${path}`;
  const message = params.clientId + (params.accessToken || "") + params.t + stringToSign;
  return hmac(message, params.secret);
}

export async function tuyaRequest<T>(params: {
  region: string;
  clientId: string;
  secret: string;
  accessToken?: string;
  method?: "GET" | "POST";
  path: string;
  body?: unknown;
}): Promise<T> {
  const method = params.method || "GET";
  const body = params.body ? JSON.stringify(params.body) : "";
  const t = Date.now().toString();
  const host = TUYA_HOSTS[params.region] || TUYA_HOSTS.eu;
  const path = signedPath(params.path);
  const sign = signRequest({
    clientId: params.clientId,
    secret: params.secret,
    accessToken: params.accessToken,
    method,
    path,
    body,
    t,
  });

  const headers: Record<string, string> = {
    client_id: params.clientId,
    t,
    sign_method: "HMAC-SHA256",
    sign,
  };
  if (params.accessToken) headers.access_token = params.accessToken;
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${host}${path}`, {
    method,
    headers,
    body: body || undefined,
    cache: "no-store",
  });
  const data = (await response.json()) as T & { success?: boolean; msg?: string; code?: number };
  if (!response.ok || data.success === false) {
    throw new Error(friendlyTuyaError(data.msg, data.code, response.status));
  }
  return data;
}

function friendlyTuyaError(msg?: string, code?: number, status?: number) {
  const text = (msg || "").toLowerCase();
  if (code === 1004 || text.includes("sign invalid")) {
    return "Tuya podpis ni veljaven. Preveri Access ID, Access Secret in regijo (Evropa).";
  }
  if (code === 1106 || text.includes("permission") || text.includes("not subscribe")) {
    return "Tuya API ni odobren. V projektu odpri Service API in odobri IoT Core.";
  }
  if (code === 2009 || text.includes("token is expired")) {
    return "Tuya žeton je potekel. Poskusi znova.";
  }
  return msg || `Tuya napaka ${code || status}.`;
}

export async function tuyaToken(clientId: string, secret: string, region: string) {
  const data = await tuyaRequest<{
    result: { access_token: string; uid: string };
  }>({
    region,
    clientId,
    secret,
    path: "/v1.0/token?grant_type=1",
  });
  return data.result;
}

type TuyaDeviceRaw = {
  id?: string;
  device_id?: string;
  devId?: string;
  uuid?: string;
  name?: string;
  customName?: string;
  custom_name?: string;
  device_name?: string;
  productName?: string;
  product_name?: string;
  category?: string;
  online?: boolean;
  is_online?: boolean;
  isOnline?: boolean;
  status?: Array<{ code: string; value: unknown }>;
};

export type TuyaMappedDevice = {
  id: string;
  name: string;
  kind: DeviceKind;
  code: string;
  channel: number;
  on: boolean;
  reachable: boolean;
  category?: string;
};

export function mapTuyaChannels(item: TuyaDeviceRaw): TuyaMappedDevice[] {
  const id = String(item.id || item.device_id || item.devId || item.uuid || "");
  const name = String(
    item.customName ||
      item.custom_name ||
      item.name ||
      item.device_name ||
      item.productName ||
      item.product_name ||
      `Tuya ${id.slice(-4)}`,
  );
  const codes = tuyaSwitchCodes(item.status);
  const kind = tuyaKind(item.category, name);
  const online = item.isOnline ?? item.is_online ?? item.online;
  return codes.map((code, index) => ({
    id,
    name: tuyaChannelName(name, code, index, codes.length),
    kind,
    code,
    channel: tuyaChannelNumber(code, index),
    on: tuyaIsOn(item.status, code),
    reachable: online !== false,
    category: item.category,
  }));
}

function extractDevices(result: unknown): TuyaDeviceRaw[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as TuyaDeviceRaw[];
  if (typeof result !== "object") return [];
  const value = result as {
    devices?: TuyaDeviceRaw[];
    list?: TuyaDeviceRaw[];
    data?: TuyaDeviceRaw[];
  };
  return value.devices || value.list || value.data || [];
}

async function tryList(
  region: string,
  clientId: string,
  secret: string,
  accessToken: string,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<TuyaDeviceRaw[]> {
  const data = await tuyaRequest<{ result?: unknown }>({
    region,
    clientId,
    secret,
    accessToken,
    method,
    path,
    body,
  });
  return extractDevices(data.result);
}

async function readSwitchCodes(
  region: string,
  clientId: string,
  secret: string,
  accessToken: string,
  deviceId: string,
) {
  const codes: string[] = [];
  try {
    const data = await tuyaRequest<{ result?: Array<{ code: string; value?: unknown }> }>({
      region,
      clientId,
      secret,
      accessToken,
      path: `/v1.0/devices/${deviceId}/status`,
    });
    codes.push(...tuyaSwitchCodes(data.result));
  } catch {
    /* status is optional */
  }
  try {
    const data = await tuyaRequest<{
      result?: {
        functions?: Array<{ code?: string; type?: string }>;
        status?: Array<{ code?: string; type?: string }>;
      };
    }>({
      region,
      clientId,
      secret,
      accessToken,
      path: `/v1.0/devices/${deviceId}/functions`,
    });
    const listed = [
      ...(data.result?.functions || []),
      ...(data.result?.status || []),
    ]
      .map((item) => String(item.code || ""))
      .filter((code) => isSwitchDp(code));
    codes.push(...listed);
  } catch {
    /* functions are optional */
  }
  return sortSwitchCodes(codes);
}

async function enrichStatus(
  region: string,
  clientId: string,
  secret: string,
  accessToken: string,
  devices: TuyaMappedDevice[],
) {
  const grouped = new Map<string, TuyaMappedDevice[]>();
  for (const device of devices) {
    const list = grouped.get(device.id) || [];
    list.push(device);
    grouped.set(device.id, list);
  }

  const next: TuyaMappedDevice[] = [];
  for (const [id, group] of grouped) {
    const discovered = await readSwitchCodes(region, clientId, secret, accessToken, id);
    const codes = sortSwitchCodes([
      ...discovered,
      ...group.map((item) => item.code),
    ]);
    const base = group[0];
    const baseName = base.name.replace(/\s+\d+$/, "").trim() || base.name;
    let status: Array<{ code: string; value: unknown }> | undefined;
    try {
      const data = await tuyaRequest<{ result?: Array<{ code: string; value: unknown }> }>({
        region,
        clientId,
        secret,
        accessToken,
        path: `/v1.0/devices/${id}/status`,
      });
      status = data.result;
    } catch {
      status = undefined;
    }
    const channels = codes.length ? codes : ["switch_1"];
    for (const [index, code] of channels.entries()) {
      next.push({
        ...base,
        name: tuyaChannelName(baseName, code, index, channels.length),
        code,
        channel: tuyaChannelNumber(code, index),
        on: tuyaIsOn(status, code),
      });
    }
  }
  return next;
}

export async function tuyaListDevices(clientId: string, secret: string, region: string) {
  const token = await tuyaToken(clientId, secret, region);
  const collected = new Map<string, TuyaMappedDevice>();
  let lastError: Error | null = null;
  let projectError: Error | null = null;

  const add = (items: TuyaDeviceRaw[]) => {
    for (const item of items) {
      for (const mapped of mapTuyaChannels(item)) {
        const key = `${mapped.id}:${mapped.code}`;
        if (mapped.id && !collected.has(key)) collected.set(key, mapped);
      }
    }
  };

  const pull = async (path: string, method: "GET" | "POST" = "GET", body?: unknown) => {
    try {
      add(await tryList(region, clientId, secret, token.access_token, path, method, body));
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  };

  let lastId = "";
  for (let page = 0; page < 10; page += 1) {
    const before = collected.size;
    const path = lastId
      ? `/v2.0/cloud/thing/device?last_id=${lastId}&page_size=20`
      : "/v2.0/cloud/thing/device?page_size=20";
    try {
      const items = await tryList(region, clientId, secret, token.access_token, path);
      add(items);
      if (items.length < 20) break;
      lastId = String(items[items.length - 1]?.id || items[items.length - 1]?.device_id || "");
      if (!lastId || collected.size === before) break;
    } catch (error) {
      projectError = error instanceof Error ? error : projectError;
      lastError = projectError;
      break;
    }
  }

  await pull("/v1.0/iot-03/devices?page_no=1&page_size=100");
  await pull("/v1.3/iot-03/devices?page_no=1&page_size=100");
  await pull("/v1.0/iot-03/devices/query", "POST", { page_no: 1, page_size: 100 });
  await pull(`/v1.0/users/${token.uid}/devices`);

  try {
    const users = await tuyaRequest<{
      result?: { list?: Array<{ uid?: string; user_id?: string }> };
    }>({
      region,
      clientId,
      secret,
      accessToken: token.access_token,
      path: "/v1.0/iot-01/associated-users/actions/search?page_size=50",
    });
    for (const user of users.result?.list || []) {
      const uid = user.uid || user.user_id;
      if (!uid) continue;
      await pull(`/v1.0/users/${uid}/devices`);
      try {
        const homes = await tuyaRequest<{
          result?: Array<{ home_id?: number; homeId?: number }>;
        }>({
          region,
          clientId,
          secret,
          accessToken: token.access_token,
          path: `/v1.0/users/${uid}/homes`,
        });
        for (const home of homes.result || []) {
          const homeId = home.home_id || home.homeId;
          if (homeId) await pull(`/v1.0/homes/${homeId}/devices`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : lastError;
      }
    }
  } catch (error) {
    lastError = error instanceof Error ? error : lastError;
  }

  try {
    const homes = await tuyaRequest<{
      result?: Array<{ home_id?: number; homeId?: number }>;
    }>({
      region,
      clientId,
      secret,
      accessToken: token.access_token,
      path: `/v1.0/users/${token.uid}/homes`,
    });
    for (const home of homes.result || []) {
      const homeId = home.home_id || home.homeId;
      if (homeId) await pull(`/v1.0/homes/${homeId}/devices`);
    }
  } catch (error) {
    lastError = error instanceof Error ? error : lastError;
  }

  const devices = [...collected.values()];
  if (devices.length === 0 && projectError) throw projectError;
  return enrichStatus(region, clientId, secret, token.access_token, devices);
}
