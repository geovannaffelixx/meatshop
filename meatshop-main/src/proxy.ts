import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/shared/config/api-url";
import { LOGIN_ROUTE, SESSION_COOKIE_NAMES, shouldRedirectToLogin } from "@/shared/auth/session-guard";

export function proxy(request: NextRequest) {
  // In a container, Next may build request.url with its internal bind hostname.
  const requestedUrl = new URL(request.url);
  const host = request.headers.get('host');
  if (host) requestedUrl.host = host;
  const redirect = shouldRedirectToLogin({
    pathname: request.nextUrl.pathname,
    requestHostname: requestedUrl.hostname,
    apiUrl: API_URL,
    hasSessionCookie: SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name)),
    fetchSite: request.headers.get("sec-fetch-site"),
  });
  if (!redirect) return NextResponse.next();
  return NextResponse.redirect(new URL(LOGIN_ROUTE, requestedUrl));
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
