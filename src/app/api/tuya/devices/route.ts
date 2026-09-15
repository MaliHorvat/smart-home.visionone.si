import { NextResponse } from "next/server";
import { tuyaListDevices } from "@/lib/tuya";

export async function POST(request: Request) {
  const body = await request.json();
  const clientId = String(body.clientId || "");
  const secret = String(body.secret || "");
  const region = String(body.region || "eu");
  if (!clientId || !secret) {
    return NextResponse.json({ error: "Manjkata Tuya Access ID in Access Secret." }, { status: 400 });
  }

  try {
    const devices = await tuyaListDevices(clientId, secret, region);
    return NextResponse.json({
      devices,
      hint:
        devices.length === 0
          ? "Tuya API je povezan, ampak seznam naprav je prazen. V iot.tuya.com → Cloud → API Product preveri, da je IoT Core odobren, nato znova uvozi."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuya uvoz ni uspel." },
      { status: 502 },
    );
  }
}
