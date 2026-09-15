import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const haUrl = String(body.haUrl || "").replace(/\/$/, "");
  const token = body.token || "";
  const entityId = body.entityId || "";
  const on = Boolean(body.on);
  if (!haUrl || !token || !entityId) {
    return NextResponse.json({ error: "Manjkajo podatki za Home Assistant." }, { status: 400 });
  }

  const domain = entityId.split(".")[0];
  const service = on ? "turn_on" : "turn_off";
  const response = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity_id: entityId }),
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Ukaza ni bilo mogoče izvesti." }, { status: 502 });
  }

  return NextResponse.json({
    state: { on, reachable: true, lastSeen: new Date().toISOString() },
  });
}
