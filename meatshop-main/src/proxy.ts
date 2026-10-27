import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/shared/config/api-url";
import { LOGIN_ROUTE, SESSION_COOKIE_NAMES, shouldRedirectToLogin } from "@/shared/auth/session-guard";

export function proxy(request: NextRequest) {
  const redirect = shouldRedirectToLogin({
    pathname: request.nextUrl.pathname,
    requestHostname: request.nextUrl.hostname,
    apiUrl: API_URL,
    hasSessionCookie: SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name)),
    fetchSite: request.headers.get("sec-fetch-site"),
  });
  if (!redirect) return NextResponse.next();
  return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
