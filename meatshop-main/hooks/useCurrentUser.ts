"use client";

import { apiGet } from "@/lib/api"; // 👈 IMPORTANTE
import { useEffect, useState } from "react";

export type CurrentUser = {
  id: number;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  usuario: string;
  telefone?: string;
  celular?: string;
  logoUrl?: string | null;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  descricao?: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ================================
  // 1) Busca o usuário via /users/me usando cookies HttpOnly
  // ================================
  async function fetchMe() {
    try {
      const data = await apiGet("/users/me"); // 👈 AGORA USANDO API PADRÃO

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
