'use client';

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { CheckCircle2, Image as ImageIcon, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Spinner } from "@/shared/components/ui/spinner";
import { RequiredMark } from "@/shared/components/ui/required-mark";
import { apiPost, API_URL } from "@/shared/lib/api";

function RequiredLabel({ label, htmlFor, required = false }: { label: string; htmlFor: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="font-medium text-sm text-gray-700">
      {label}
      {required && <RequiredMark />}
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

type CepLookup = Pick<FormData, "street" | "neighborhood" | "city" | "state"> & {
  zip_code: string;
  latitude: number;
  longitude: number;
};

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
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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
  const [withoutNumber, setWithoutNumber] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState("");
  const [msg, setMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepResolved, setCepResolved] = useState(false);
  const router = useRouter();

  const lookupCep = async () => {
    if (lookingUpCep) return;
    const cep = form.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) {
      setErrors((previous) => ({ ...previous, zipCode: true }));
      setMsg("Informe um CEP válido com 8 dígitos.");
      setAlertType("error");
      return;
    }

    setLookingUpCep(true);
    setCepResolved(false);
    setMsg("");
    setAlertType("");
    try {
      const address = await apiPost("/geocoding/resolve", {
        zip_code: cep,
      }) as CepLookup;
      setForm((current) => ({
        ...current,
        zipCode: address.zip_code,
        street: address.street,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      }));
      setErrors((previous) => ({
        ...previous,
        zipCode: false,
        street: false,
        neighborhood: false,
        city: false,
        state: false,
      }));
      setCepResolved(true);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
      setAlertType("error");
    } finally {
      setLookingUpCep(false);
    }
  };

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

  const handleWithoutNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithoutNumber(e.target.checked);
    if (e.target.checked) setForm((f) => ({ ...f, number: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};

    REQUIRED_FIELDS.forEach((field) => {
      if (field === "number" && withoutNumber) return;
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 bg-[url('/backgroundClaro.png')] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold tracking-tight text-red-700">
            Crie sua unidade
          </CardTitle>
          <p className="text-center text-sm text-slate-600">
            Configure o açougue e o acesso do proprietário.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="font-semibold mb-2">Seu açougue</h2>
              <div className="grid gap-0.5">
                <RequiredLabel htmlFor="unit-name" label="Nome do açougue" required />
                <Input
                  id="unit-name"
                  value={form.unitName}
                  onChange={handleChange("unitName")}
                  className={inputClass("unitName")}
                  placeholder="Ex.: Açougue Central"
                  required
                />
                <RequiredLabel htmlFor="unit-cnpj" label="CNPJ" required />
                <Input
                  id="unit-cnpj"
                  inputMode="numeric"
                  value={form.cnpj}
                  onInput={(e) => {
                    const value = maskCNPJ(e.currentTarget.value);
                    setForm((f) => ({ ...f, cnpj: value }));
                  }}
                  className={inputClass("cnpj")}
                  placeholder="00.000.000/0000-00"
                  required
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
                <RequiredLabel htmlFor="unit-zip-code" label="CEP" required />
                <div className="flex gap-2">
                  <Input
                    id="unit-zip-code"
                    inputMode="numeric"
                    value={form.zipCode}
                    onInput={(e) => {
                      const value = maskCEP(e.currentTarget.value);
                      setCepResolved(false);
                      setForm((f) => ({ ...f, zipCode: value }));
                      setErrors((previous) => ({ ...previous, zipCode: false }));
                    }}
                    onBlur={() => {
                      if (form.zipCode.replace(/\D/g, "").length === 8 && !cepResolved) {
                        void lookupCep();
                      }
                    }}
                    className={inputClass("zipCode")}
                    placeholder="00000-000"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lookingUpCep || form.zipCode.replace(/\D/g, "").length !== 8}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void lookupCep()}
                    className="min-w-28"
                  >
                    {lookingUpCep ? <Spinner /> : <Search className="h-4 w-4" />}
                    {lookingUpCep ? "Buscando" : "Buscar"}
                  </Button>
                </div>
                {cepResolved && (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Endereço localizado. Confira o número e o complemento.
                  </p>
                )}
                <RequiredLabel htmlFor="unit-street" label="Logradouro" required />
                <Input
                  id="unit-street"
                  value={form.street}
                  onChange={handleChange("street")}
                  className={inputClass("street")}
                  placeholder="Ex.: Avenida Paulista"
                  required
                />
                <RequiredLabel htmlFor="unit-number" label="Número" />
                <div className="flex items-center gap-2">
                  <Input
                    id="unit-number"
                    value={form.number}
                    onChange={handleChange("number")}
                    disabled={withoutNumber}
                    className={`${inputClass("number")} ${withoutNumber ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    placeholder="Ex.: 1000"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={withoutNumber} onChange={handleWithoutNumberChange} />
                    S/N
                  </label>
                </div>
                <RequiredLabel htmlFor="unit-complement" label="Complemento" />
                <Input id="unit-complement" value={form.complement} onChange={handleChange("complement")} placeholder="Ex.: Loja 2" />
                <RequiredLabel htmlFor="unit-neighborhood" label="Bairro" required />
                <Input
                  id="unit-neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange("neighborhood")}
                  className={inputClass("neighborhood")}
                  placeholder="Ex.: Centro"
                  required
                />
                <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                  <div className="grid gap-1">
                    <RequiredLabel htmlFor="unit-city" label="Cidade" required />
                    <Input
                      id="unit-city"
                      value={form.city}
                      onChange={handleChange("city")}
                      className={inputClass("city")}
                      placeholder="Ex.: Cuiabá"
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <RequiredLabel htmlFor="unit-state" label="UF" required />
                    <Input
                      id="unit-state"
                      value={form.state}
                      maxLength={2}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
                      className={inputClass("state")}
                      placeholder="MT"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Seus dados</h2>
              <div className="grid gap-1">
                <RequiredLabel htmlFor="owner-name" label="Nome completo" required />
                <Input
                  id="owner-name"
                  autoComplete="name"
                  value={form.ownerName}
                  onChange={handleChange("ownerName")}
                  className={inputClass("ownerName")}
                  placeholder="Ex.: Maria da Silva"
                  required
                />
                <RequiredLabel htmlFor="owner-email" label="E-mail" required />
                <Input
                  id="owner-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className={inputClass("email")}
                  placeholder="nome@empresa.com.br"
                  required
                />
                <RequiredLabel htmlFor="owner-cpf" label="CPF" required />
                <Input
                  id="owner-cpf"
                  inputMode="numeric"
                  value={form.cpf}
                  onInput={(e) => {
                    const value = maskCPF(e.currentTarget.value);
                    setForm((f) => ({ ...f, cpf: value }));
                  }}
                  className={inputClass("cpf")}
                  placeholder="000.000.000-00"
                  required
                />
                <RequiredLabel htmlFor="owner-password" label="Senha" required />
                <PasswordInput
                  id="owner-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  autoComplete="new-password"
                  className={inputClass("password")}
                  placeholder="Digite uma senha segura"
                  required
                />
                <RequiredLabel htmlFor="owner-password-confirmation" label="Confirme sua senha" required />
                <PasswordInput
                  id="owner-password-confirmation"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  autoComplete="new-password"
                  className={inputClass("confirmPassword")}
                  placeholder="Repita a senha"
                  required
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
          <p className="text-center text-sm text-slate-600">
            Já possui uma conta?{" "}
            <button type="button" onClick={() => router.push("/login")} className="font-semibold text-red-700 hover:underline">
              Entrar
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
