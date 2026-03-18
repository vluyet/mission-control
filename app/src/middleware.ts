import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionTokenDetailed } from "@/lib/auth";

function isPublicPath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/favicon.ico";
}

function isPublicApi(pathname: string) {
  return pathname === "/api/auth/sign-in" || pathname === "/api/auth/sign-out" || pathname === "/api/health";
}

function isStaticAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.includes(".");
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicPath(pathname) || isPublicApi(pathname)) {
    if (pathname === "/sign-in") {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      const session = await verifySessionTokenDetailed(token);

      if (session.status === "valid") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionTokenDetailed(token);

  if (session.status === "valid") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const authorization = request.headers.get("authorization");

    if (authorization?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          message: session.status === "expired" ? "Session expired." : "Authentication required.",
          details: { code: session.status === "expired" ? "SESSION_EXPIRED" : "UNAUTHENTICATED" }
        }
      },
      { status: 401 }
    );
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("next", `${pathname}${search}`);
  if (session.status === "expired") {
    signInUrl.searchParams.set("reason", "expired");
  }
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
