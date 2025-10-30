'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function LabelObrigatorio({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <label className="font-medium text-sm text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function LabelNaoObrigatorio({ label }: { label: string }) {
  return (
    <label className="font-medium text-sm text-gray-700">
      {label}
    </label>
  );
}

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

  const [semNumero, setSemNumero] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "">("");
  const router = useRouter();

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const maskTelefone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  };

  const maskCelular = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{1})(\d{4})(\d)/, "$1 $2-$3")
      .slice(0, 16);
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  };

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

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setForm({ ...form, numero: value });
  };

  const handleSemNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSemNumero(checked);
    if (checked) setForm({ ...form, numero: "" });
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
        if (field === "numero" && semNumero) return;
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
    setAlertType("");

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
          numero: form.numero || "S/N",
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
      setAlertType("success");
      setTimeout(() => router.push("/entrar"), 3000);
    } catch (err: any) {
      setMsg(err.message);
      setAlertType("error");
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

            <div>
              <h2 className="font-semibold mb-2">Dados do Perfil</h2>
              <div className="grid gap-0.5">
                <LabelObrigatorio label="Nome Fantasia" required />
                <Input name="nomeFantasia" placeholder="" onChange={handleChange} className={inputClass("nomeFantasia")} />
                <LabelObrigatorio label="Razão Social" required />
                <Input name="razaoSocial" placeholder="" onChange={handleChange} className={inputClass("razaoSocial")} />
                <LabelObrigatorio label="CNPJ" required />
                <Input
                  name="cnpj"
                  placeholder=""
                  value={form.cnpj}
                  onInput={(e) => setForm({ ...form, cnpj: maskCNPJ(e.currentTarget.value) })}
                  className={inputClass("cnpj")}
                />
                <LabelNaoObrigatorio label="Telefone"/>
                <Input
                  name="telefone"
                  placeholder=""
                  value={form.telefone}
                  onInput={(e) => setForm({ ...form, telefone: maskTelefone(e.currentTarget.value) })}
                  className={inputClass("telefone")}
                />
                <LabelObrigatorio label="Celular" required />
                <Input
                  name="celular"
                  placeholder=""
                  value={form.celular}
                  onInput={(e) => setForm({ ...form, celular: maskCelular(e.currentTarget.value) })}
                  className={inputClass("celular")}
                />

                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 mt-2">
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Selecionar logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="imagemPerfil"
                    className="hidden"
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Endereço</h2>
              <LabelObrigatorio label="CEP" required />
              <div className="grid gap-1">
                <Input
                  name="cep" 
                  placeholder=""
                  value={form.cep}
                  onInput={(e) => setForm({ ...form, cep: maskCEP(e.currentTarget.value) })}
                  className={inputClass("cep")}
                />
                <LabelObrigatorio label="Logradouro" required />
                <Input name="logradouro" placeholder="" onChange={handleChange} className={inputClass("logradouro")} />
                <LabelObrigatorio label="Número" required />
                <div className="flex items-center gap-2">
                  <Input
                    name="numero"
                    placeholder=""
                    value={form.numero}
                    onChange={handleNumeroChange}
                    disabled={semNumero}
                    className={`${inputClass("numero")} ${semNumero ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={semNumero} onChange={handleSemNumeroChange} />
                    S/N
                  </label>
                </div>
                <LabelNaoObrigatorio label="Complemento"/>
                <Input name="complemento" placeholder="" onChange={handleChange} className={inputClass("complemento")} />
                <LabelObrigatorio label="Bairro" required />
                <Input name="bairro" placeholder="" onChange={handleChange} className={inputClass("bairro")} />
                <LabelObrigatorio label="Cidade" required />
                <Input name="cidade" placeholder="" onChange={handleChange} className={inputClass("cidade")} />
                <LabelObrigatorio label="Estado" required />
                <Input name="estado" placeholder="Estdo" onChange={handleChange} className={inputClass("estado")} />
                <LabelObrigatorio label="País" required />
                <Input name="pais" placeholder="" onChange={handleChange} className={inputClass("pais")} />
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Dados de Login</h2>
              <div className="grid gap-1">
                <LabelObrigatorio label="E-mail" required />
                <Input name="email" placeholder="" onChange={handleChange} className={inputClass("email")} />
                <LabelObrigatorio label="Usuário" required />
                <Input name="usuario" placeholder="" onChange={handleChange} className={inputClass("usuario")} />
                <LabelObrigatorio label="Senha" required />
                <Input type="password" name="senha" placeholder="" onChange={handleChange} className={inputClass("senha")} />
                <LabelObrigatorio label="Confirme sua senha" required />
                <Input type="password" name="confirmarSenha" placeholder="" onChange={handleChange} className={inputClass("confirmarSenha")} />
                <p className="text-sm text-gray-500 mt-1">
                  Mínimo 8 caracteres <br /> Pelo menos 1 letra maiúscula
                </p>
                {passwordError && (
                  <Alert className="mt-2">
                    <AlertTitle>Erro!</AlertTitle>
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70">
              Cadastrar
            </Button>
          </form>

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