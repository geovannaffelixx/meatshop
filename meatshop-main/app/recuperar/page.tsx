'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MailIcon } from "lucide-react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setAlertType("");

    if (!email.trim()) {
      setMsg("Informe seu e-mail.");
      setAlertType("error");
      return;
    }

    try {
      await apiPost("/auth/forgot-password", { email });

      setMsg("Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      setAlertType("success");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao solicitar redefinição de senha.");
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
            Informe seu e-mail para receber o link de redefinição de senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70">
              Enviar link de redefinição
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
