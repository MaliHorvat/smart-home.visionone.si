import { NextResponse } from "next/server";
import { checkCredentials, createSession, sessionCookieOptions, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");
  if (!(await checkCredentials(username, password))) {
    return NextResponse.json({ error: "Napačno uporabniško ime ali geslo." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await createSession(username.trim()), sessionCookieOptions());
  return response;
}
