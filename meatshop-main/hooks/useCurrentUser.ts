"use client";
import { useEffect, useState } from "react";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  logoUrl?: string | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("currentUser");
    const token = localStorage.getItem("accessToken");

    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }

    async function fetchMe() {
      try {
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = await res.json();
        if (data?.ok && data?.user) {
          setUser(data.user);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        }
      } catch (e) {
        console.error("Erro ao buscar /users/me", e);
      } finally {
        setLoading(false);
      }
    }

    fetchMe();
  }, []);

    useEffect(() => {
    function handleUpdate() {
      try {
        const raw = localStorage.getItem("currentUser");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    }

    window.addEventListener("currentUserUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("currentUserUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return { user, loading, setUser };
}
