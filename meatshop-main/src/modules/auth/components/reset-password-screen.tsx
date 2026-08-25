'use client';

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { LockIcon } from "lucide-react";
import Link from "next/link";
import { apiPost } from "@/shared/lib/api";

function validarSenha(senha: string) {
  return (
    senha.length >= 8 &&
    /[a-z]/.test(senha) &&
    /[A-Z]/.test(senha) &&
    /\d/.test(senha) &&
    /[\W_]/.test(senha)
  );
}

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Link de redefinição inválido ou expirado.");
      return;
    }

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!validarSenha(senha)) {
      setError(
        "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
      );
      return;
    }

    setLoading(true);

    try {
      await apiPost("/auth/reset-password", { token, new_password: senha });

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 bg-[url('/BackgroundClaro.png')]">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="flex flex-col items-center">
          <LockIcon className="w-10 h-10 text-[#BE2C1B] mb-2" />
          <CardTitle className="text-xl font-bold text-center text-[#BE2C1B]">
            Defina uma nova senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600 text-sm">
            Sua nova senha deve ser diferente das anteriores.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              placeholder="Nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              className="border border-gray-300 focus:ring-[#BE2C1B] focus:border-[#BE2C1B]"
            />

            <PasswordInput
              placeholder="Confirmar nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              autoComplete="new-password"
              className="border border-gray-300 focus:ring-[#BE2C1B] focus:border-[#BE2C1B]"
            />

            <ul className="text-sm text-gray-500 list-disc pl-5">
              <li>Mínimo de 8 caracteres</li>
              <li>Maiúscula, minúscula, número e caractere especial</li>
            </ul>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70"
            >
              {loading && <Spinner />}
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-sm text-[#BE2C1B] hover:underline">
              ← Voltar para login
            </Link>
          </div>

          {success && (
            <Alert className="mt-4">
              <AlertTitle>Senha redefinida com sucesso!</AlertTitle>
              <AlertDescription>
                Você será redirecionado para o login em instantes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPasswordScreen() {
  return (
    <Suspense>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
