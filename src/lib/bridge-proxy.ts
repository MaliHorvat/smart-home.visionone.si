import { NextResponse } from "next/server";

export async function callBridge(
  body: { bridgeUrl?: string; token?: string; [key: string]: unknown },
  path: string,
  method: "GET" | "POST" = "POST",
) {
  const bridgeUrl = String(body.bridgeUrl || process.env.BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(body.token || process.env.BRIDGE_TOKEN || "");
  if (!bridgeUrl || !token) {
    return NextResponse.json({ error: "Most ni nastavljen. Vpiši URL in žeton." }, { status: 400 });
  }

  const response = await fetch(`${bridgeUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-bridge-token": token,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error || "Most ni dosegljiv." },
      { status: response.status === 401 ? 401 : 502 },
    );
  }
  return NextResponse.json(data, { status: response.status === 202 ? 200 : 200 });
}
