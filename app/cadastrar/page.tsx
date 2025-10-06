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
    senha: "",
    confirmarSenha: "",
    imagemPerfil: null,
  });

  const [semNumero, setSemNumero] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState("");
  const [showAlert, setShowAlert] = useState(false);
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
      "nomeFantasia", "razaoSocial", "cnpj",
      "cep", "logradouro", "numero", "complemento",
      "bairro", "cidade", "estado", "pais",
      "email", "senha", "confirmarSenha", "celular"
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setShowAlert(true);
    setTimeout(() => router.push("/entrar"), 5000);
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
              <div className="grid gap-3">
                <Input name="nomeFantasia" placeholder="Nome Fantasia" onChange={handleChange} className={inputClass("nomeFantasia")} />
                <Input name="razaoSocial" placeholder="Razão Social" onChange={handleChange} className={inputClass("razaoSocial")} />

                <Input
                  name="cnpj"
                  placeholder="CNPJ"
                  value={form.cnpj}
                  onInput={(e) => setForm({ ...form, cnpj: maskCNPJ(e.currentTarget.value) })}
                  className={inputClass("cnpj")}
                />

                <Input
                  name="telefone"
                  placeholder="Telefone"
                  value={form.telefone}
                  onInput={(e) => setForm({ ...form, telefone: maskTelefone(e.currentTarget.value) })}
                  className={inputClass("telefone")}
                />

                <Input
                  name="celular"
                  placeholder="Celular"
                  value={form.celular}
                  onInput={(e) => setForm({ ...form, celular: maskCelular(e.currentTarget.value) })}
                  className={inputClass("celular")}
                />

                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100">
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
              <div className="grid gap-3">
                <Input
                  name="cep"
                  placeholder="CEP"
                  value={form.cep}
                  onInput={(e) => setForm({ ...form, cep: maskCEP(e.currentTarget.value) })}
                  className={inputClass("cep")}
                />
                <Input name="logradouro" placeholder="Logradouro" onChange={handleChange} className={inputClass("logradouro")} />

                <div className="flex items-center gap-2">
                  <Input
                    name="numero"
                    placeholder="N°"
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

                <Input name="complemento" placeholder="Complemento" onChange={handleChange} className={inputClass("complemento")} />
                <Input name="bairro" placeholder="Bairro" onChange={handleChange} className={inputClass("bairro")} />
                <Input name="cidade" placeholder="Cidade" onChange={handleChange} className={inputClass("cidade")} />
                <Input name="estado" placeholder="Estado" onChange={handleChange} className={inputClass("estado")} />
                <Input name="pais" placeholder="País" onChange={handleChange} className={inputClass("pais")} />
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Dados de Login</h2>
              <div className="grid gap-1">
                <Input name="email" placeholder="E-mail" onChange={handleChange} className={inputClass("email")} />
                <Input type="password" name="senha" placeholder="Senha" onChange={handleChange} className={inputClass("senha")} />
                <Input type="password" name="confirmarSenha" placeholder="Confirmação de Senha" onChange={handleChange} className={inputClass("confirmarSenha")} />
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

          {showAlert && (
            <Alert className="mt-4">
              <AlertTitle>Cadastro realizado!</AlertTitle>
              <AlertDescription>
                Cadastro feito com sucesso, você será redirecionado em 5 segundos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}