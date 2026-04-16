import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionTokenDetailed } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, normalizeLocale } from "@/lib/i18n/config";

function isPublicPath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/favicon.ico";
}

function isPublicApi(pathname: string) {
  return (
    pathname === "/api/auth/sign-in" ||
    pathname === "/api/auth/sign-out" ||
    pathname === "/api/health" ||
    /^\/api\/tasks\/[^/]+\/constructor\/callback$/.test(pathname)
  );
}

function isStaticAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.includes(".");
}

function resolveMiddlewareLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const accepted = request.headers.get("accept-language")?.toLowerCase() ?? "";
  const matched = SUPPORTED_LOCALES.find((locale) => accepted.includes(locale));
  return matched ?? DEFAULT_LOCALE;
}

function applyNoStoreHeaders(response: NextResponse, pathname: string, method: string) {
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) {
    return response;
  }

  if (method !== "GET" && method !== "HEAD") {
    return response;
  }

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicPath(pathname) || isPublicApi(pathname)) {
    if (pathname === "/sign-in") {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      const session = await verifySessionTokenDetailed(token);

      if (session.status === "valid") {
        return applyNoStoreHeaders(NextResponse.redirect(new URL("/", request.url)), pathname, request.method);
      }
    }

    return applyNoStoreHeaders(NextResponse.next(), pathname, request.method);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionTokenDetailed(token);

  if (session.status === "valid") {
    return applyNoStoreHeaders(NextResponse.next(), pathname, request.method);
  }

  if (pathname.startsWith("/api/")) {
    const authorization = request.headers.get("authorization");

    if (authorization?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.next();
    }

    const messages = getMessages(resolveMiddlewareLocale(request));

    return applyNoStoreHeaders(
      NextResponse.json(
        {
          ok: false,
          error: {
            message: session.status === "expired" ? messages.api.sessionExpired : messages.api.authenticationRequired,
            details: { code: session.status === "expired" ? "SESSION_EXPIRED" : "UNAUTHENTICATED" }
          }
        },
        { status: 401 }
      ),
      pathname,
      request.method
    );
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("next", `${pathname}${search}`);
  if (session.status === "expired") {
    signInUrl.searchParams.set("reason", "expired");
  }
  return applyNoStoreHeaders(NextResponse.redirect(signInUrl), pathname, request.method);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
