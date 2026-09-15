import { NextResponse } from "next/server";

async function forward(bridgeUrl: string, token: string, path: string, payload: unknown) {
  const response = await fetch(`${bridgeUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-token": token,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: Request) {
  const body = await request.json();
  const bridgeUrl = body.bridgeUrl || process.env.BRIDGE_URL;
  const token = body.token || process.env.BRIDGE_TOKEN;
  if (!bridgeUrl || !token) {
    return NextResponse.json({ error: "Most ni nastavljen." }, { status: 400 });
  }
  const result = await forward(bridgeUrl, token, "/scan", { subnet: body.subnet });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.data.error || "Most ni dosegljiv." },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
