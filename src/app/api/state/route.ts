import { NextResponse } from "next/server";
import { readCloudState, writeCloudState } from "@/lib/server-state";
import type { HomeState } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const state = await readCloudState();
  return NextResponse.json({ state });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = body.state as HomeState | undefined;
  if (!state?.devices || !state.settings) {
    return NextResponse.json({ error: "Manjka stanje plošče." }, { status: 400 });
  }
  const persisted = await writeCloudState({ ...state, version: 3, updatedAt: state.updatedAt || Date.now() });
  return NextResponse.json({ ok: true, persisted });
}
