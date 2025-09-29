'use client'

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input"
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const [showPassword, setShowPassword] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Falha no login");
      }

      // Salvar token
      localStorage.setItem("token", data.token);

      setMsg("Login realizado com sucesso!");
      router.push("/home"); // redireciona após sucesso
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-1/3 h-screen relative">
        <img
          src="/entrar.png"
          alt="Imagem"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-2/3 flex items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-6 p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800">Bem-vindo</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Usuário ou E-mail</label>
              <Input
                placeholder="Informe seu usuário ou e-mail"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Informe sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
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
                <Link href="/recuperar" className="text-sm text-red-600 hover:underline left-1">
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

          {msg && (
            <p className="text-center text-sm text-red-600 mt-2">{msg}</p>
          )}

          <p className="text-center text-sm text-gray-600">
            Não tem uma conta?{" "}
            <Link href="/cadastrar" className="text-red-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
