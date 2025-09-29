'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormData {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  email: string;
  usuario: string;
  senha: string;
  confirmarSenha: string;
  imagemPerfil?: File | null;
}

export default function CadastroAcougue() {
  const [form, setForm] = useState<FormData>({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    telefone: "",
    celular: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "",
    email: "",
    usuario: "",
    senha: "",
    confirmarSenha: "",
    imagemPerfil: null,
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;

    if (name === "imagemPerfil" && files) {
      setForm({ ...form, imagemPerfil: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }

    setErrors({ ...errors, [name]: false });

    if (name === "senha" || name === "confirmarSenha") {
      setPasswordError("");
    }
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    const requiredFields = [
      "nomeFantasia", "razaoSocial", "cnpj", "telefone", "celular",
      "cep", "logradouro", "numero", "bairro", "cidade", "estado", "pais",
      "email", "usuario", "senha", "confirmarSenha"
    ];

    requiredFields.forEach(field => {
      if (!form[field as keyof FormData] || form[field as keyof FormData]?.toString().trim() === "") {
        newErrors[field] = true;
      }
    });

    if (form.senha !== form.confirmarSenha) {
      newErrors.senha = true;
      newErrors.confirmarSenha = true;
      setPasswordError("As senhas não coincidem.");
    }

    if (form.senha && !/(?=.*[A-Z]).{8,}/.test(form.senha)) {
      newErrors.senha = true;
      setPasswordError("A senha deve ter no mínimo 8 caracteres e pelo menos 1 letra maiúscula.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");

    if (!validate()) return;

    try {
      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFantasia: form.nomeFantasia,
          razaoSocial: form.razaoSocial,
          cnpj: form.cnpj,
          telefone: form.telefone,
          celular: form.celular,
          logoUrl: form.imagemPerfil ? form.imagemPerfil.name : "",
          cep: form.cep,
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          pais: form.pais,
          email: form.email,
          usuario: form.usuario,
          senha: form.senha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Erro no cadastro");
      }

      setMsg("Cadastro realizado com sucesso! Redirecionando...");
      setTimeout(() => router.push("/entrar"), 3000);
    } catch (err: any) {
      setMsg(err.message);
    }
  };

  const inputClass = (name: string) =>
    errors[name] ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/BackgroundClaro.png')] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-clip-text bg-gradient-to-r text-[#BE2C1B] tracking-wide">
            Cadastro de Açougue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seções mantidas iguais */}
            {/* ... */}
            <Button type="submit" className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70">
              Cadastrar
            </Button>
          </form>

          {passwordError && (
            <Alert className="mt-4">
              <AlertTitle>Erro!</AlertTitle>
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}

          {msg && (
            <Alert className="mt-4">
              <AlertTitle>Mensagem</AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
