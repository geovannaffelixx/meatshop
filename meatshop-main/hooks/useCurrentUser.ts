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

  async function fetchMe() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return setUser(null);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data?.ok && data?.user) {
        setUser(data.user);
        localStorage.setItem("currentUser", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Erro ao buscar /users/me", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = localStorage.getItem("currentUser");
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {}
    }
    fetchMe();
  }, []);

  useEffect(() => {
    function handleUpdate() {
      const raw = localStorage.getItem("currentUser");
      setUser(raw ? JSON.parse(raw) : null);
    }
    window.addEventListener("currentUserUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("currentUserUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return { user, loading, setUser, refetch: fetchMe };
}
