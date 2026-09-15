import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const haUrl = String(body.haUrl || "").replace(/\/$/, "");
  const token = body.token || "";
  const entityId = body.entityId || "";
  if (!haUrl || !token || !entityId) {
    return NextResponse.json({ error: "Manjkajo podatki za Home Assistant." }, { status: 400 });
  }

  const response = await fetch(`${haUrl}/api/states/${entityId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Stanja ni bilo mogoče prebrati." }, { status: 502 });
  }
  const data = await response.json();
  return NextResponse.json({
    state: {
      on: ["on", "true", "home", "heat", "cool"].includes(data.state),
      reachable: data.state !== "unavailable",
      lastSeen: data.last_updated,
      extra: data.state,
    },
  });
}
