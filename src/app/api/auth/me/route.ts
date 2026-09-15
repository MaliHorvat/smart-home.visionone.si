import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const user = await verifySession(token);
  return NextResponse.json({ authenticated: Boolean(user), user });
}
