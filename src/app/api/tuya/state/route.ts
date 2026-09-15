import { NextResponse } from "next/server";
import { tuyaIsOn, tuyaRequest, tuyaToken } from "@/lib/tuya";

export async function POST(request: Request) {
  const body = await request.json();
  const clientId = String(body.clientId || "");
  const secret = String(body.secret || "");
  const region = String(body.region || "eu");
  const deviceId = String(body.deviceId || "");
  const code = String(body.code || "switch_1");
  if (!clientId || !secret || !deviceId) {
    return NextResponse.json({ error: "Manjkajo Tuya podatki." }, { status: 400 });
  }

  try {
    const token = await tuyaToken(clientId, secret, region);
    const data = await tuyaRequest<{
      result: Array<{ code: string; value: unknown }>;
    }>({
      region,
      clientId,
      secret,
      accessToken: token.access_token,
      path: `/v1.0/devices/${deviceId}/status`,
    });
    return NextResponse.json({
      state: {
        on: tuyaIsOn(data.result, code),
        reachable: true,
        lastSeen: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuya status ni na voljo." },
      { status: 502 },
    );
  }
}
