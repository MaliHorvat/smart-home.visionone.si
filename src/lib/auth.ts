export const AUTH_COOKIE = "smarthome_session";
export const SESSION_DAYS = 30;

export function authCredentials() {
  return {
    user: process.env.AUTH_USER || "admin",
    password: process.env.AUTH_PASSWORD || "geslo123",
    secret: process.env.AUTH_SECRET || "smarthome-visionone-session",
  };
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] || 0) ^ (b[i] || 0);
  }
  return diff === 0;
}

export async function checkCredentials(username: string, password: string) {
  const { user, password: expected } = authCredentials();
  return safeEqual(username.trim(), user) && safeEqual(password, expected);
}

export async function createSession(username: string) {
  const { secret } = authCredentials();
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${username}.${exp}`;
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySession(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, expRaw, signature] = parts;
  const exp = Number(expRaw);
  if (!username || !Number.isFinite(exp) || exp < Date.now()) return null;
  const { user, secret } = authCredentials();
  const expected = await hmacHex(secret, `${username}.${exp}`);
  if (!safeEqual(signature, expected) || !safeEqual(username, user)) return null;
  return username;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
