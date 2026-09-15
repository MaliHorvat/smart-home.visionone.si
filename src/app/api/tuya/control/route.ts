import { NextResponse } from "next/server";
import { tuyaRequest, tuyaToken } from "@/lib/tuya";

export async function POST(request: Request) {
  const body = await request.json();
  const clientId = String(body.clientId || "");
  const secret = String(body.secret || "");
  const region = String(body.region || "eu");
  const deviceId = String(body.deviceId || "");
  const code = String(body.code || "switch_1");
  const on = Boolean(body.on);
  if (!clientId || !secret || !deviceId) {
    return NextResponse.json({ error: "Manjkajo Tuya podatki." }, { status: 400 });
  }

  try {
    const token = await tuyaToken(clientId, secret, region);
    await tuyaRequest({
      region,
      clientId,
      secret,
      accessToken: token.access_token,
      method: "POST",
      path: `/v1.0/devices/${deviceId}/commands`,
      body: { commands: [{ code, value: on }] },
    });
    return NextResponse.json({
      state: { on, reachable: true, lastSeen: new Date().toISOString() },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuya ukaza ni sprejel." },
      { status: 502 },
    );
  }
}
