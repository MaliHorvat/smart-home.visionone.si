import type { DeviceKind } from "./types";

export const TUYA_SWITCH_OPTIONS = ["switch_1", "switch_2", "switch_3", "switch_4", "switch_5", "switch_6"];

export function tuyaKind(category?: string, name?: string): DeviceKind {
  const value = `${category || ""} ${name || ""}`.toLowerCase();
  if (/(wsdcg|temp|humid|senzor|sensor|weather|klima)/.test(value)) return "sensor";
  if (/(gate|fence|ograja|vrata|cl)/.test(value)) return "gate";
  if (/(dj|dd|fwd|dc|light|lamp|luc|led)/.test(value)) return "light";
  if (/(cz|pc|plug|socket|vtic)/.test(value)) return "plug";
  if (/(wk|climate|thermo)/.test(value)) return "thermostat";
  return "switch";
}

export function isTempDp(code: string) {
  return /^(temp_current|temperature|va_temperature|local_temp|temp_indoor|temp_outdoor|cur_temperature|temp_current_f)$/i.test(
    code,
  );
}

export function isHumidityDp(code: string) {
  return /^(humidity|humidity_value|va_humidity|relative_humidity|humidity_indoor|rh|humidity_current)$/i.test(
    code,
  );
}

export function tuyaScaleNumber(value: unknown, sensor = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  if (sensor && Math.abs(number) > 80) return number / 10;
  return number;
}

export function tuyaReadTemp(status?: Array<{ code: string; value?: unknown }>) {
  const item = (status || []).find((entry) => isTempDp(entry.code));
  return item ? tuyaScaleNumber(item.value, true) : undefined;
}

export function tuyaReadHumidity(status?: Array<{ code: string; value?: unknown }>) {
  const item = (status || []).find((entry) => isHumidityDp(entry.code));
  return item ? tuyaScaleNumber(item.value, Number(item.value) > 100) : undefined;
}

export function tuyaTempCode(status?: Array<{ code: string; value?: unknown }>) {
  return (status || []).find((entry) => isTempDp(entry.code))?.code
    || (status || []).find((entry) => isHumidityDp(entry.code))?.code
    || "temp_current";
}

export function isSwitchDp(code: string, value?: unknown) {
  if (/^(switch|switch_led|led_switch)(_\d+)?$/i.test(code)) return true;
  if (/^(switch|relay|outlet|socket)_\d+$/i.test(code)) return true;
  if (/^switch\d+$/i.test(code)) return true;
  return typeof value === "boolean" && /^(switch|relay|led)/i.test(code);
}

export function tuyaChannelNumber(code: string, index = 0) {
  const match = code.match(/(\d+)$/);
  if (match) return Number(match[1]);
  return index + 1;
}

export function sortSwitchCodes(codes: string[]) {
  return [...new Set(codes.filter(Boolean))].sort((left, right) => {
    const diff = tuyaChannelNumber(left) - tuyaChannelNumber(right);
    return diff !== 0 ? diff : left.localeCompare(right);
  });
}

export function tuyaSwitchCodes(status?: Array<{ code: string; value?: unknown }>) {
  const fromStatus = (status || [])
    .filter((item) => isSwitchDp(item.code, item.value))
    .map((item) => item.code);
  if (fromStatus.length) return sortSwitchCodes(fromStatus);
  if ((status || []).some((item) => isTempDp(item.code) || isHumidityDp(item.code))) return [];
  const firstBool = (status || []).find((item) => typeof item.value === "boolean");
  return firstBool?.code ? [firstBool.code] : [];
}

export function tuyaSwitchCode(status?: Array<{ code: string; value: unknown }>) {
  return tuyaSwitchCodes(status)[0] || "switch_1";
}

export function tuyaChannelName(baseName: string, code: string, index: number, total: number) {
  const name = baseName.replace(/\s+\d+$/, "").trim() || baseName;
  if (total <= 1) return name;
  return `${name} ${tuyaChannelNumber(code, index)}`;
}

export function tuyaChannelKey(address: string, code?: string) {
  return `${address}::${code || "switch_1"}`;
}

export function tuyaIsOn(status?: Array<{ code: string; value: unknown }>, code?: string) {
  const item =
    (status || []).find((entry) => entry.code === code) ||
    (status || []).find((entry) => typeof entry.value === "boolean");
  return Boolean(item?.value);
}
