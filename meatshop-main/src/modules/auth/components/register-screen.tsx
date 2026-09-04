'use client';

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Spinner } from "@/shared/components/ui/spinner";
import { apiPost, API_URL } from "@/shared/lib/api";

function RequiredLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <label className="font-medium text-sm text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface FormData {
  unitName: string;
  cnpj: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  ownerName: string;
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
}

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "unitName", "cnpj", "zipCode", "street", "neighborhood", "city", "state",
  "ownerName", "email", "cpf", "password", "confirmPassword",
];

function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function maskCEP(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .slice(0, 9);
}

function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
}

function isPasswordValid(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

export function RegisterScreen() {
  const [form, setForm] = useState<FormData>({
    unitName: "",
    cnpj: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    ownerName: "",
    email: "",
    cpf: "",
    password: "",
    confirmPassword: "",
  });
  const [semNumero, setSemNumero] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
    if (field === "password" || field === "confirmPassword") setPasswordError("");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogo(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleSemNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSemNumero(e.target.checked);
    if (e.target.checked) setForm((f) => ({ ...f, number: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};

    REQUIRED_FIELDS.forEach((field) => {
      if (field === "number" && semNumero) return;
      if (!form[field].trim()) newErrors[field] = true;
    });

    if (form.state && !/^[A-Za-z]{2}$/.test(form.state)) {
      newErrors.state = true;
    }

    if (form.password !== form.confirmPassword) {
      newErrors.password = true;
      newErrors.confirmPassword = true;
      setPasswordError("As senhas não coincidem.");
    } else if (form.password && !isPasswordValid(form.password)) {
      newErrors.password = true;
      setPasswordError(
        "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setAlertType("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const data = await apiPost("/auth/register-unit", {
        owner: {
          name: form.ownerName,
          email: form.email,
          cpf: form.cpf.replace(/\D/g, ""),
          password: form.password,
        },
        unit: {
          name: form.unitName,
          cnpj: form.cnpj.replace(/\D/g, ""),
          city: form.city,
          state: form.state.toUpperCase(),
          zip_code: form.zipCode,
          street: form.street,
          number: form.number || undefined,
          complement: form.complement || undefined,
          neighborhood: form.neighborhood,
        },
      });

      if (logo && data?.unit?.id) {
        const formData = new FormData();
        formData.append("file", logo);

        await fetch(`${API_URL}/units/${data.unit.id}/logo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }

      setMsg("Açougue cadastrado com sucesso! Redirecionando...");
      setAlertType("success");

      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao cadastrar açougue.");
      setAlertType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    errors[field] ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "";

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
              <h2 className="font-semibold mb-2">Seu açougue</h2>
              <div className="grid gap-0.5">
                <RequiredLabel label="Nome do açougue" required />
                <Input
                  value={form.unitName}
                  onChange={handleChange("unitName")}
                  className={inputClass("unitName")}
                />
                <RequiredLabel label="CNPJ" required />
                <Input
                  value={form.cnpj}
                  onInput={(e) => {
                    const value = maskCNPJ(e.currentTarget.value);
                    setForm((f) => ({ ...f, cnpj: value }));
                  }}
                  className={inputClass("cnpj")}
                />

                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 mt-2">
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Selecionar logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                {previewUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-gray-600">Pré-visualização:</span>
                    <Image
                      src={previewUrl}
                      alt="Pré-visualização da logo"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full object-cover border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Endereço</h2>
              <div className="grid gap-1">
                <RequiredLabel label="CEP" required />
                <Input
                  value={form.zipCode}
                  onInput={(e) => {
                    const value = maskCEP(e.currentTarget.value);
                    setForm((f) => ({ ...f, zipCode: value }));
                  }}
                  className={inputClass("zipCode")}
                />
                <RequiredLabel label="Logradouro" required />
                <Input
                  value={form.street}
                  onChange={handleChange("street")}
                  className={inputClass("street")}
                />
                <RequiredLabel label="Número" />
                <div className="flex items-center gap-2">
                  <Input
                    value={form.number}
                    onChange={handleChange("number")}
                    disabled={semNumero}
                    className={`${inputClass("number")} ${semNumero ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={semNumero} onChange={handleSemNumeroChange} />
                    S/N
                  </label>
                </div>
                <RequiredLabel label="Complemento" />
                <Input value={form.complement} onChange={handleChange("complement")} />
                <RequiredLabel label="Bairro" required />
                <Input
                  value={form.neighborhood}
                  onChange={handleChange("neighborhood")}
                  className={inputClass("neighborhood")}
                />
                <RequiredLabel label="Cidade" required />
                <Input
                  value={form.city}
                  onChange={handleChange("city")}
                  className={inputClass("city")}
                />
                <RequiredLabel label="Estado (UF)" required />
                <Input
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className={inputClass("state")}
                />
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Seus dados</h2>
              <div className="grid gap-1">
                <RequiredLabel label="Nome completo" required />
                <Input
                  value={form.ownerName}
                  onChange={handleChange("ownerName")}
                  className={inputClass("ownerName")}
                />
                <RequiredLabel label="E-mail" required />
                <Input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className={inputClass("email")}
                />
                <RequiredLabel label="CPF" required />
                <Input
                  value={form.cpf}
                  onInput={(e) => {
                    const value = maskCPF(e.currentTarget.value);
                    setForm((f) => ({ ...f, cpf: value }));
                  }}
                  className={inputClass("cpf")}
                />
                <RequiredLabel label="Senha" required />
                <PasswordInput
                  value={form.password}
                  onChange={handleChange("password")}
                  autoComplete="new-password"
                  className={inputClass("password")}
                />
                <RequiredLabel label="Confirme sua senha" required />
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  autoComplete="new-password"
                  className={inputClass("confirmPassword")}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                </p>
                {passwordError && (
                  <Alert className="mt-2">
                    <AlertTitle>Erro!</AlertTitle>
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#BE2C1B] hover:bg-[#BE2C1B]/70"
            >
              {submitting && <Spinner />}
              {submitting ? "Cadastrando..." : "Cadastrar"}
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
