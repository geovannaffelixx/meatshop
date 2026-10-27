export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function socketEndpoint(namespace: string) {
  const api = new URL(API_URL);
  return {
    url: `${api.origin}${namespace}`,
    path: `${api.pathname.replace(/\/$/, "")}/socket.io`,
    transports: ["polling", "websocket"],
  };
}
