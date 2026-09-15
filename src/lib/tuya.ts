import crypto from "node:crypto";
import type { DeviceKind } from "./types";

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

function signRequest(params: {
  clientId: string;
  secret: string;
  accessToken?: string;
  method: string;
  path: string;
  body?: string;
  t: string;
}) {
  const bodyHash = sha256Hex(params.body || "");
  const stringToSign = `${params.method}\n${bodyHash}\n\n${params.path}`;
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
  const sign = signRequest({
    clientId: params.clientId,
    secret: params.secret,
    accessToken: params.accessToken,
    method,
    path: params.path,
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

  const response = await fetch(`${host}${params.path}`, {
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

export function tuyaKind(category?: string, name?: string): DeviceKind {
  const value = `${category || ""} ${name || ""}`.toLowerCase();
  if (/(gate|fence|ograja|vrata|cl)/.test(value)) return "gate";
  if (/(dj|dd|fwd|dc|light|lamp|luc|led)/.test(value)) return "light";
  if (/(cz|pc|plug|socket|vtic)/.test(value)) return "plug";
  if (/(wk|climate|thermo)/.test(value)) return "thermostat";
  return "switch";
}

export function tuyaSwitchCode(
  status?: Array<{ code: string; value: unknown }>,
) {
  const codes = status || [];
  const match = codes.find((item) =>
    /^(switch_led|switch_1|switch_on|switch|led_switch)$/i.test(item.code),
  );
  return match?.code || codes.find((item) => typeof item.value === "boolean")?.code || "switch_1";
}

export function tuyaIsOn(
  status?: Array<{ code: string; value: unknown }>,
  code?: string,
) {
  const item =
    (status || []).find((entry) => entry.code === code) ||
    (status || []).find((entry) => typeof entry.value === "boolean");
  return Boolean(item?.value);
}

type TuyaDeviceRaw = {
  id?: string;
  device_id?: string;
  name?: string;
  customName?: string;
  custom_name?: string;
  category?: string;
  online?: boolean;
  is_online?: boolean;
  status?: Array<{ code: string; value: unknown }>;
};

export function mapTuyaDevice(item: TuyaDeviceRaw) {
  const id = String(item.id || item.device_id || "");
  const name = String(item.name || item.customName || item.custom_name || `Tuya ${id.slice(-4)}`);
  const code = tuyaSwitchCode(item.status);
  return {
    id,
    name,
    kind: tuyaKind(item.category, name),
    code,
    on: tuyaIsOn(item.status, code),
    reachable: item.online !== false && item.is_online !== false,
    category: item.category,
  };
}

async function tryList(
  region: string,
  clientId: string,
  secret: string,
  accessToken: string,
  path: string,
): Promise<TuyaDeviceRaw[]> {
  const data = await tuyaRequest<{
    result?:
      | TuyaDeviceRaw[]
      | {
          devices?: TuyaDeviceRaw[];
          list?: TuyaDeviceRaw[];
        };
  }>({
    region,
    clientId,
    secret,
    accessToken,
    path,
  });
  const result = data.result;
  if (Array.isArray(result)) return result;
  return result?.devices || result?.list || [];
}

async function enrichStatus(
  region: string,
  clientId: string,
  secret: string,
  accessToken: string,
  devices: ReturnType<typeof mapTuyaDevice>[],
) {
  const next = [...devices];
  for (const device of next) {
    try {
      const data = await tuyaRequest<{ result?: Array<{ code: string; value: unknown }> }>({
        region,
        clientId,
        secret,
        accessToken,
        path: `/v1.0/devices/${device.id}/status`,
      });
      const code = tuyaSwitchCode(data.result);
      device.code = code;
      device.on = tuyaIsOn(data.result, code);
    } catch {
      /* status is optional at import time */
    }
  }
  return next;
}

export async function tuyaListDevices(clientId: string, secret: string, region: string) {
  const token = await tuyaToken(clientId, secret, region);
  const auth = {
    region,
    clientId,
    secret,
    accessToken: token.access_token,
  };
  const attempts = [
    "/v1.0/iot-03/devices?page_no=1&page_size=100",
    "/v1.3/iot-03/devices?page_no=1&page_size=100",
    `/v1.0/users/${token.uid}/devices`,
  ];

  let lastError: Error | null = null;
  let listedOk = false;

  for (const path of attempts) {
    try {
      const items = await tryList(region, clientId, secret, token.access_token, path);
      listedOk = true;
      const devices = items.map(mapTuyaDevice).filter((item) => item.id);
      if (devices.length > 0) return enrichStatus(region, clientId, secret, token.access_token, devices);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Tuya seznam ni uspel.");
    }
  }

  try {
    const users = await tuyaRequest<{
      result?: { list?: Array<{ uid?: string }> };
    }>({
      ...auth,
      path: "/v1.0/iot-01/associated-users/actions/search?page_no=1&page_size=50",
    });
    listedOk = true;
    for (const user of users.result?.list || []) {
      if (!user.uid) continue;
      const items = await tryList(region, clientId, secret, token.access_token, `/v1.0/users/${user.uid}/devices`);
      const devices = items.map(mapTuyaDevice).filter((item) => item.id);
      if (devices.length > 0) return enrichStatus(region, clientId, secret, token.access_token, devices);
    }
  } catch (error) {
    lastError = error instanceof Error ? error : lastError;
  }

  try {
    const homes = await tuyaRequest<{
      result?: Array<{ home_id?: number; homeId?: number; name?: string }>;
    }>({
      ...auth,
      path: `/v1.0/users/${token.uid}/homes`,
    });
    listedOk = true;
    for (const home of homes.result || []) {
      const homeId = home.home_id || home.homeId;
      if (!homeId) continue;
      const items = await tryList(region, clientId, secret, token.access_token, `/v1.0/homes/${homeId}/devices`);
      const devices = items.map(mapTuyaDevice).filter((item) => item.id);
      if (devices.length > 0) return enrichStatus(region, clientId, secret, token.access_token, devices);
    }
  } catch (error) {
    lastError = error instanceof Error ? error : lastError;
  }

  if (!listedOk && lastError) throw lastError;
  return [];
}
