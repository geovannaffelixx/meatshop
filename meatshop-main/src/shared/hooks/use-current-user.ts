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

  // ================================
  // 1) Busca o usuário via /users/me usando cookies HttpOnly
  // ================================
  async function fetchMe() {
    try {
      const data = await apiGet("/users/me");  // 👈 AGORA USANDO API PADRÃO

      if (data?.ok && data?.user) {
        setUser(data.user);

        // Salva no cache local (sidebar instantânea)
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        window.dispatchEvent(new Event("currentUserUpdated"));
      }
    } catch (err) {
      // Quando o cookie expirou → 401 → não autenticado
      setUser(null);
      localStorage.removeItem("currentUser");
      console.error("Erro ao buscar /users/me", err);
    } finally {
      setLoading(false);
    }
  }

  // ================================
  // 2) Carrega cache local antes do request
  // ================================
  useEffect(() => {
    const cached = localStorage.getItem("currentUser");
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {}
    }
    fetchMe();
  }, []);

  // ================================
  // 3) Atualiza quando login/logout acontece
  // ================================
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
