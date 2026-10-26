import { API_URL } from "@/shared/config/api-url";

export const CSRF_HEADER = "x-csrf-token";
const CSRF_INVALID_CODE = "CSRF_TOKEN_INVALID";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
const CSRF_EXEMPT_PATHS = [
  "/auth/csrf",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

let csrfToken: string | null = null;
let pendingToken: Promise<string | null> | null = null;

export function resetCsrfToken() {
  csrfToken = null;
  pendingToken = null;
}

async function requestCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/csrf`, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const payload = (await res.json()) as { csrf_token?: unknown };
    return typeof payload.csrf_token === "string" ? payload.csrf_token : null;
  } catch {
    return null;
  }
}

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  pendingToken ??= requestCsrfToken();
  const token = await pendingToken;
  pendingToken = null;
  csrfToken = token;
  return token;
}

function requiresCsrf(path: string, method = "GET") {
  if (SAFE_METHODS.includes(method.toUpperCase())) return false;
  return !CSRF_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

async function withCsrfHeader(path: string, init: RequestInit): Promise<RequestInit> {
  if (!requiresCsrf(path, init.method)) return init;
  const token = await getCsrfToken();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set(CSRF_HEADER, token);
  return { ...init, headers };
}

async function isCsrfRejection(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const payload = (await res.clone().json()) as { code?: unknown };
    return payload.code === CSRF_INVALID_CODE;
  } catch {
    return false;
  }
}

export async function fetchWithCsrf(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, await withCsrfHeader(path, init));
  if (!requiresCsrf(path, init.method) || !(await isCsrfRejection(res))) return res;
  resetCsrfToken();
  return fetch(`${API_URL}${path}`, await withCsrfHeader(path, init));
}
