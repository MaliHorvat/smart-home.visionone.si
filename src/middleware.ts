import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/icon.svg",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await verifySession(token);

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Potrebna je prijava." }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png$|.*\\.svg$).*)"],
};
