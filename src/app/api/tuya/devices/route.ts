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
          ? "Povezava z Tuya oblakom deluje, ampak ni naprav. V iot.tuya.com odpri projekt → Devices → Link Tuya App Account in s telefonom skeniraj QR v Tuya / Smart Life. Nato v Cloud → API Product odobri IoT Core."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuya uvoz ni uspel." },
      { status: 502 },
    );
  }
}
