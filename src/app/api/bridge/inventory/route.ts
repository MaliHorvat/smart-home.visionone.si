import { NextResponse } from "next/server";
import { callBridge } from "@/lib/bridge-proxy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return callBridge(body, "/inventory", "POST");
  } catch {
    return NextResponse.json({ error: "Most ni dosegljiv." }, { status: 502 });
  }
}
