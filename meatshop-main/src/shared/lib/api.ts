import { ApiError, translateApiError } from "@/shared/lib/api-error-translations";
import { toast } from "@/shared/lib/toast";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Endpoints públicos de autenticação: um 401 aqui é uma resposta normal
// (ex.: senha errada), não uma sessão expirada — nunca deve disparar refresh.
const AUTH_EXEMPT_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/register-unit",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

function isAuthExempt(path: string) {
  return AUTH_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

// Compartilha uma única renovação em andamento entre chamadas concorrentes
// que recebam 401 ao mesmo tempo, evitando várias requisições de refresh.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let payload: unknown = text;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // Mantém o texto original quando a API não retorna JSON.
    }

    throw new ApiError(translateApiError(payload, res.status), res.status, payload);
  }

  // Alguns endpoints podem retornar 204 (sem conteúdo)
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type RequestOptions = { silent?: boolean; retried?: boolean };

async function request(path: string, init: RequestInit, options: RequestOptions = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      credentials: "include",
      redirect: "follow",
      ...init,
    });

    if (res.status === 401 && !options.retried && !isAuthExempt(path)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return request(path, init, { ...options, retried: true });
      }
      window.dispatchEvent(new Event("auth:session-expired"));
    }

    return await handleResponse(res);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : translateApiError(error instanceof Error ? error.message : error);

    if (!options.silent) toast.error(message);

    if (error instanceof ApiError) throw error;
    throw new ApiError(message, 0, error);
  }
}

export async function apiGet(path: string, options?: RequestOptions) {
  return request(path, { method: "GET" }, options);
}

export async function apiPost(path: string, data: any, options?: RequestOptions) {
  return request(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    options,
  );
}

export async function apiPatch(path: string, data: any, options?: RequestOptions) {
  return request(
    path,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    options,
  );
}

export async function apiPut(path: string, data: unknown, options?: RequestOptions) {
  return request(
    path,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    options,
  );
}

export async function apiDelete(path: string, options?: RequestOptions) {
  return request(path, { method: "DELETE" }, options);
}
