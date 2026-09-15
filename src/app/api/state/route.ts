import { NextResponse } from "next/server";
import { readCloudState, writeCloudState } from "@/lib/server-state";
import type { HomeState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const state = await readCloudState();
  return noStore({ state });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = body.state as HomeState | undefined;
  if (!state?.devices || !state.settings) {
    return noStore({ error: "Manjka stanje plošče." }, 400);
  }
  const result = await writeCloudState({
    ...state,
    version: 3,
    updatedAt: state.updatedAt || Date.now(),
  });
  return noStore({ ok: true, ...result });
}
