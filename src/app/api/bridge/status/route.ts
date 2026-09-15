import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const bridgeUrl = body.bridgeUrl || process.env.BRIDGE_URL;
  const token = body.token || process.env.BRIDGE_TOKEN;
  if (!bridgeUrl || !token) {
    return NextResponse.json({ error: "Most ni nastavljen." }, { status: 400 });
  }

  const response = await fetch(`${String(bridgeUrl).replace(/\/$/, "")}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-token": token,
    },
    body: JSON.stringify({ device: body.device }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Status ni na voljo." }, { status: 502 });
  }
  return NextResponse.json(data);
}
