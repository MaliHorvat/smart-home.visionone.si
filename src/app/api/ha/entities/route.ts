import { NextResponse } from "next/server";

function cleanBase(url: string) {
  return url.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const body = await request.json();
  const haUrl = cleanBase(body.haUrl || "");
  const token = body.token || "";
  if (!haUrl || !token) {
    return NextResponse.json({ error: "Manjkata URL in žeton Home Assistant." }, { status: 400 });
  }

  const response = await fetch(`${haUrl}/api/states`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Home Assistant je odgovoril z ${response.status}.` },
      { status: 502 },
    );
  }

  const states = (await response.json()) as Array<{
    entity_id: string;
    state: string;
    attributes?: { friendly_name?: string };
  }>;

  const devices = states
    .filter((item) => /^(light|switch|input_boolean|fan|climate)\./.test(item.entity_id))
    .map((item) => ({
      entityId: item.entity_id,
      name: item.attributes?.friendly_name || item.entity_id,
      kind: item.entity_id.startsWith("light")
        ? "light"
        : item.entity_id.startsWith("climate")
          ? "thermostat"
          : item.entity_id.startsWith("fan")
            ? "other"
            : "switch",
      on: ["on", "true", "home", "heat", "cool"].includes(item.state),
      reachable: item.state !== "unavailable",
    }));

  return NextResponse.json({ devices });
}
