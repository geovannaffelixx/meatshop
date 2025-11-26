export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  return handleResponse(res);
}

export async function apiPost(path: string, data: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiPatch(path: string, data: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
