"use client";

import { useState } from "react";
import PageLayout from "@/shared/components/page-layout";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Spinner } from "@/shared/components/ui/spinner";
import { apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

export function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) return toast.warning("A confirmação não corresponde à nova senha.");
    setSaving(true);
    try {
      await apiPost("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      toast.success("Senha alterada com sucesso.");
    } catch { /* Erro apresentado pelo cliente da API. */ }
    finally { setSaving(false); }
  }

  return <PageLayout title="Segurança da conta" image="/logoClaraEscrita.png"><div className="p-6"><section className="max-w-xl rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">Segurança da conta</h1><p className="mt-1 text-sm text-gray-600">Altere a sua senha de acesso ao painel.</p><form onSubmit={submit} className="mt-6 space-y-4">{[["Senha atual", currentPassword, setCurrentPassword], ["Nova senha", newPassword, setNewPassword], ["Confirmar nova senha", confirmation, setConfirmation]].map(([label, value, setter]) => <label key={label as string} className="block text-sm font-medium text-gray-700">{label as string}<PasswordInput value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} autoComplete={label === "Senha atual" ? "current-password" : "new-password"} className="mt-1 w-full" required /></label>)}<p className="text-xs text-gray-500">Use pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial.</p><button disabled={saving} className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving && <Spinner />}{saving ? "Alterando..." : "Alterar senha"}</button></form></section></div></PageLayout>;
}
