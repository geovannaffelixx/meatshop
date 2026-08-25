"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageLayout from "@/shared/components/page-layout";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { Spinner } from "@/shared/components/ui/spinner";
import { API_URL, apiPatch } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

function formatCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function AccountForm() {
  const { user, refresh } = usePanelAccess();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  if (!user) return <p className="p-6 text-gray-500">Carregando conta...</p>;

  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.warning("Preencha nome e e-mail.");
      return;
    }

    setSaving(true);
    try {
      await apiPatch("/users/me", { name: name.trim(), email: email.trim() });
      await refresh();
      toast.success(
        emailChanged
          ? "Dados atualizados. Enviamos um link de confirmação para o novo e-mail."
          : "Dados atualizados com sucesso.",
      );
    } catch {
      // Erro apresentado pelo cliente da API.
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file || !user) return;
    setUploadingAvatar(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/logo`, {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Não foi possível enviar a imagem.");
      await refresh();
      toast.success("Foto de perfil atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const avatarSrc = user.avatar_url
    ? user.avatar_url.startsWith("http")
      ? user.avatar_url
      : `${API_URL}${user.avatar_url}`
    : null;

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha conta</h1>
        <p className="mt-1 text-sm text-gray-600">Suas informações pessoais de acesso ao painel.</p>

        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-400">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            {uploadingAvatar && <Spinner />}
            {uploadingAvatar ? "Enviando..." : "Alterar foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={(event) => void uploadAvatar(event.target.files?.[0])}
            />
          </label>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 md:col-span-2">
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
            {emailChanged && (
              <span className="mt-1 block text-xs text-amber-600">
                Ao salvar, você precisará confirmar o novo e-mail antes de usá-lo para entrar novamente.
              </span>
            )}
          </label>

          <label className="text-sm font-medium text-gray-700">
            CPF
            <input
              value={formatCpf(user.cpf)}
              disabled
              className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-500"
            />
          </label>

          <p className="text-xs text-gray-500 md:col-span-2">
            Cadastrado em {formatMemberSince(user.created_at)}.
          </p>

          <div className="md:col-span-2">
            <button
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {saving && <Spinner />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Senha</h2>
        <p className="mt-1 text-sm text-gray-600">
          Para trocar sua senha, acesse{" "}
          <Link href="/settings/security" className="text-red-600 hover:underline">
            Segurança da conta
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

export function AccountScreen() {
  return (
    <PageLayout title="Minha conta" image="/logoClaraEscrita.png">
      <AccountForm />
    </PageLayout>
  );
}
