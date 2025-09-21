'use client';

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function VerificarCodigo() {
  const [codigo, setCodigo] = useState(["", "", "", ""]);
  const [showAlert, setShowAlert] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    if (/^\d$/.test(value)) {
      const novoCodigo = [...codigo];
      novoCodigo[index] = value;
      setCodigo(novoCodigo);

      if (index < inputsRef.current.length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && codigo[index] === "") {
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.some((digit) => digit === "")) {
      setError("Preencha todos os dígitos do código.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.join("") }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao verificar o código.");
      }

      setShowAlert(true);
      // Redirecionar após sucesso
      setTimeout(() => {
        window.location.href = "/redefinir-senha";
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await fetch("/api/reenviar-codigo", { method: "POST" });
      alert("Código reenviado com sucesso!");
    } catch {
      alert("Erro ao reenviar o código.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 bg-[url('/BackgroundClaro.png')]">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-xl font-bold text-center text-[#BE2C1B]">
            Verifique seu e-mail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600 text-sm">
            Digite o código enviado para <span className="font-medium">meat********@gmail.com</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center gap-3">
              {codigo.map((digit, index) => (
                <Input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={digit}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold border border-gray-300 focus:ring-[#BE2C1B] focus:border-[#BE2C1B]"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70"
            >
              {loading ? "Verificando..." : "Próximo"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm text-[#BE2C1B] hover:underline"
              onClick={handleResend}
            >
              Não recebeu o código? Clique para reenviar
            </button>
            <Link href="/entrar" className="block text-sm text-[#BE2C1B] hover:underline">
              ← Voltar para login
            </Link>
          </div>

          {showAlert && (
            <Alert className="mt-4">
              <AlertTitle>Código verificado!</AlertTitle>
              <AlertDescription>
                Redirecionando para redefinir sua senha...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}