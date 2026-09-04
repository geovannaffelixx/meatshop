"use client";

import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Spinner } from "@/shared/components/ui/spinner";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      toast.warning("Preencha o e-mail e a senha para continuar.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await apiPost("/auth/login", { email, password: senha });
      const session = await apiGet("/users/me");

      window.dispatchEvent(new Event("currentUserUpdated"));

      toast.success("Login realizado. Redirecionando...");

      const destination = session?.panel?.can_access ? "/dashboard" : "/no-panel-access";
      setTimeout(() => router.push(destination), 800);
    } catch {
      // O cliente da API traduz e exibe o erro no toast global.
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Lado esquerdo com imagem */}
      <div className="w-1/3 h-screen relative">
        <Image
          src="/entrar.png"
          alt="Imagem"
          fill
          priority
          sizes="33vw"
          className="object-cover"
        />
      </div>

      {/* Formulário de login */}
      <div className="w-2/3 flex items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-6 p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800">
            Bem-vindo
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="Informe seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <PasswordInput
                placeholder="Informe sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
              <div className="mt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm text-red-600 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold mt-4 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Spinner />}
              {submitting ? "Entrando..." : "ENTRAR"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-red-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
