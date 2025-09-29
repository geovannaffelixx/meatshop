'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MailIcon } from "lucide-react";
import Link from "next/link";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setAlertType("");

    if (!email.trim() || !senha.trim() || !confirmarSenha.trim()) {
      setMsg("Preencha todos os campos.");
      setAlertType("error");
      return;
    }

    if (senha !== confirmarSenha) {
      setMsg("As senhas não coincidem.");
      setAlertType("error");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Erro ao redefinir senha");
      }

      setMsg("Senha redefinida com sucesso! Você já pode fazer login.");
      setAlertType("success");
    } catch (err: any) {
      setMsg(err.message);
      setAlertType("error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 bg-[url('/BackgroundClaro.png')]">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="flex flex-col items-center">
          <MailIcon className="w-10 h-10 mb-2" />
          <CardTitle className="text-xl font-bold text-center">
            Esqueceu sua senha?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600 text-sm">
            Informe seu e-mail ou usuário e defina uma nova senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail ou Usuário
              </label>
              <Input
                type="text"
                placeholder="Digite seu e-mail ou usuário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <Input
                type="password"
                placeholder="Digite a nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha
              </label>
              <Input
                type="password"
                placeholder="Confirme a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70">
              Redefinir senha
            </Button>
          </form>

          <div className="text-center">
            <Link href="/entrar" className="text-sm text-[#BE2C1B] hover:underline">
              ← Voltar para login
            </Link>
          </div>

          {msg && (
            <Alert className="mt-4">
              <AlertTitle>{alertType === "success" ? "Sucesso!" : "Erro"}</AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
