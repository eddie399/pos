import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { authSecret } from "@/lib/env";

/** Pages that must render without a session. */
const publicPaths = new Set(["/", "/login", "/register", "/setup-shop"]);

/** Prefixes served without a session (assets, auth endpoints, monitoring). */
const publicPrefixes = ["/_next", "/api/auth", "/api/health", "/api/setup-shop"];

function isPublic(pathname: string) {
  return publicPaths.has(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Same secret as `authOptions.secret` in auth.ts — if these two ever differ,
  // the session cookie cannot be decrypted here and every page redirects to
  // /login even though signing in succeeded.
  const token = await getToken({ req: request, secret: authSecret });

  if (token) {
    return NextResponse.next();
  }

  // API clients must always receive JSON, never an HTML login page.
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "You must be signed in to continue." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
