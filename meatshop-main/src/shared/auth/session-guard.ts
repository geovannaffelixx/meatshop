import { isPublicRoute } from "@/shared/auth/route-access";

export const SESSION_COOKIE_NAMES = ["access_token", "refresh_token"] as const;
export const LOGIN_ROUTE = "/login";

export type SessionGuardInput = {
  pathname: string;
  requestHostname: string;
  apiUrl: string;
  hasSessionCookie: boolean;
  fetchSite: string | null;
};

function sessionCookiesAreVisible(apiUrl: string, requestHostname: string) {
  try {
    return new URL(apiUrl).hostname === requestHostname;
  } catch {
    return false;
  }
}

export function shouldRedirectToLogin(input: SessionGuardInput): boolean {
  if (input.hasSessionCookie || isPublicRoute(input.pathname)) return false;
  if (input.fetchSite === "cross-site") return false;
  return sessionCookiesAreVisible(input.apiUrl, input.requestHostname);
}
