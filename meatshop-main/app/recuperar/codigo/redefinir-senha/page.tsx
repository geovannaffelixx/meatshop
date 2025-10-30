'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LockIcon } from "lucide-react";
import Link from "next/link";

export default function RedefinirSenha() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validarSenha = (senha: string) => {
    return senha.length >= 8 && /[A-Z]/.test(senha);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!validarSenha(senha)) {
      setError("A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra maiúscula.");
      return;
    }

    setLoading(true);

    try {
      // Envio da nova senha para o backend
      const response = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      // Tratamento de erro da API
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao redefinir a senha.");
      }

      // Sucesso: exibe alerta e redireciona
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/entrar";
      }, 3000);
    } catch (err: any) {
      setError(err.message);
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
            <Input
              type="password"
              placeholder="Nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="border border-gray-300 focus:ring-[#BE2C1B] focus:border-[#BE2C1B]"
            />

            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="border border-gray-300 focus:ring-[#BE2C1B] focus:border-[#BE2C1B]"
            />

            <ul className="text-sm text-gray-500 list-disc pl-5">
              <li>Mínimo de 8 caracteres</li>
              <li>Pelo menos uma letra maiúscula</li>
            </ul>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70"
            >
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/entrar" className="text-sm text-[#BE2C1B] hover:underline">
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