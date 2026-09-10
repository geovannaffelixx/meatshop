"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/shared/lib/api";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  cpf: string;
  created_at: string;
  avatar_url?: string | null;
  global_role: "SUPER_ADMIN" | "USER";
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const data = await apiGet("/users/me");

      if (data?.ok && data?.user) {
        setUser(data.user);

        localStorage.setItem("currentUser", JSON.stringify(data.user));
        window.dispatchEvent(new Event("currentUserUpdated"));
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem("currentUser");
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
      } catch {
        localStorage.removeItem("currentUser");
      }
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
