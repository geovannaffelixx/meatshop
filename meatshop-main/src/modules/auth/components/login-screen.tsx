"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      toast.warning("Preencha o e-mail e a senha para continuar.");
      return;
    }

    try {
      await apiPost("/auth/login", { email, password: senha });

      window.dispatchEvent(new Event("currentUserUpdated"));

      toast.success("Login realizado. Redirecionando...");

      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      // O cliente da API traduz e exibe o erro no toast global.
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Lado esquerdo com imagem */}
      <div className="w-1/3 h-screen relative">
        <img
          src="/entrar.png"
          alt="Imagem"
          className="w-full h-full object-cover"
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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Informe sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold mt-4"
            >
              ENTRAR
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
