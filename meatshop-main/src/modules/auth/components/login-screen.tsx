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
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning("Preencha o e-mail e a senha para continuar.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await apiPost("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const session = await apiGet("/users/me");

      window.dispatchEvent(new Event("currentUserUpdated"));

      toast.success("Login realizado. Redirecionando...");

      const destination = session?.panel?.can_access ? "/dashboard" : "/no-panel-access";
      router.push(destination);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[minmax(22rem,0.85fr)_1.15fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src="/entrar.png"
          alt=""
          fill
          priority
          sizes="42vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
            Gestão MeatShop
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight">
            Sua operação organizada do pedido à entrega.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">
            Acompanhe vendas, estoque, equipe e clientes em um único painel.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Image
              src="/logoEscuraCompleta.png"
              alt="MeatShop"
              width={220}
              height={90}
              priority
              className="mx-auto h-auto w-48 object-contain lg:mx-0"
            />
            <h2 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Entre com sua conta para acessar o painel de gestão.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="Informe seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-11"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                  Senha
                </label>
                <Link href="/forgot-password" className="text-sm font-semibold text-red-700 hover:underline">
                  Esqueceu sua senha?
                </Link>
              </div>
              <PasswordInput
                id="login-password"
                placeholder="Informe sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-11"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Spinner />}
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">
            Não tem uma conta?{" "}
            <Link href="/register" className="font-semibold text-red-700 hover:underline">
              Criar unidade
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
