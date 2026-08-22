import { ApiError, translateApiError } from "@/shared/lib/api-error-translations";
import { toast } from "@/shared/lib/toast";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

async function request(path: string, init: RequestInit) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      credentials: "include",
      redirect: "follow",
      ...init,
    });
    return await handleResponse(res);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : translateApiError(error instanceof Error ? error.message : error);

    toast.error(message);

    if (error instanceof ApiError) throw error;
    throw new ApiError(message, 0, error);
  }
}

export async function apiGet(path: string) {
  return request(path, {
    method: "GET",
  });
}

export async function apiPost(path: string, data: any) {
  return request(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function apiPatch(path: string, data: any) {
  return request(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function apiDelete(path: string) {
  return request(path, {
    method: "DELETE",
  });
}
