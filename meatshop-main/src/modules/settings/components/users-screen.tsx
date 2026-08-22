"use client";

import { useCallback, useEffect, useState } from "react";
import PageLayout from "@/shared/components/page-layout";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

type Role = "OWNER" | "MANAGER" | "OPERATOR";
type Member = { id: number; user: { id: number; name: string; email: string }; local_role: Role; status: "ACTIVE" | "INACTIVE" };
type NewMember = { name: string; email: string; cpf: string; password: string; local_role: "MANAGER" | "OPERATOR" };

const emptyMember: NewMember = { name: "", email: "", cpf: "", password: "", local_role: "OPERATOR" };
const labels: Record<Role, string> = { OWNER: "Proprietário", MANAGER: "Gerente", OPERATOR: "Operador" };

function TeamManager() {
  const { unitId, selectedMembership } = usePanelAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<NewMember>(emptyMember);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const canAssignManager = selectedMembership?.role === "OWNER" || selectedMembership?.role === null;

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try { setMembers(await apiGet(`/units/${unitId}/members`)); }
    finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { void load(); }, [load]);

  async function createMember(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId) return;
    setSaving(true);
    try {
      await apiPost(`/units/${unitId}/members/create`, { ...form, cpf: form.cpf.replace(/\D/g, "") });
      setForm(emptyMember);
      toast.success("Usuário criado e adicionado à equipe.");
      await load();
    } catch { /* Erro apresentado pelo cliente da API. */ }
    finally { setSaving(false); }
  }

  async function updateMember(member: Member, changes: Partial<Pick<Member, "local_role" | "status">>) {
    if (!unitId) return;
    try {
      await apiPatch(`/units/${unitId}/members/${member.id}`, changes);
      toast.success("Acesso atualizado.");
      await load();
    } catch { /* Erro apresentado pelo cliente da API. */ }
  }

  async function confirmRemoval() {
    if (!unitId || !removing) return;
    try {
      await apiDelete(`/units/${unitId}/members/${removing.id}`);
      toast.success("Usuário removido da equipe.");
      setRemoving(null);
      await load();
    } catch { /* Erro apresentado pelo cliente da API. */ }
  }

  const input = (key: keyof NewMember, label: string, type = "text") => <label className="text-sm font-medium text-gray-700">{label}<input type={type} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2" required /></label>;

  return <div className="space-y-6 p-6">
    <section className="rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold text-gray-900">Equipe e acessos</h1>
      <p className="mt-1 text-sm text-gray-600">Crie contas para funcionários e determine o que cada pessoa pode administrar nesta unidade.</p>
      <form onSubmit={createMember} className="mt-6 grid gap-4 md:grid-cols-2">
        {input("name", "Nome completo")}{input("email", "E-mail", "email")}{input("cpf", "CPF")}{input("password", "Senha temporária", "password")}
        <label className="text-sm font-medium text-gray-700">Cargo<select value={form.local_role} onChange={(event) => setForm((current) => ({ ...current, local_role: event.target.value as NewMember["local_role"] }))} className="mt-1 w-full rounded-md border px-3 py-2"><option value="OPERATOR">Operador</option>{canAssignManager && <option value="MANAGER">Gerente</option>}</select></label>
        <div className="flex items-end"><button disabled={saving} className="rounded-md bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Criando..." : "Criar usuário"}</button></div>
      </form>
      <p className="mt-3 text-xs text-gray-500">A senha é temporária e deve ser entregue ao usuário por um canal seguro. Ele poderá alterá-la em Segurança.</p>
    </section>

    <section className="overflow-x-auto rounded-xl border bg-white">
      <div className="border-b p-5"><h2 className="text-lg font-semibold">Usuários vinculados</h2><p className="text-sm text-gray-500">Proprietários não podem ser removidos nem ter o cargo alterado.</p></div>
      <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Usuário</th><th className="p-3">Cargo</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>
        {members.map((member) => <tr key={member.id} className="border-t"><td className="p-3"><strong>{member.user.name}</strong><div className="text-gray-500">{member.user.email}</div></td><td className="p-3">{member.local_role === "OWNER" ? labels.OWNER : <select aria-label={`Cargo de ${member.user.name}`} value={member.local_role} onChange={(event) => void updateMember(member, { local_role: event.target.value as "MANAGER" | "OPERATOR" })} className="rounded border px-2 py-1"><option value="OPERATOR">Operador</option>{canAssignManager && <option value="MANAGER">Gerente</option>}</select>}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${member.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{member.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></td><td className="space-x-3 p-3 text-right">{member.local_role !== "OWNER" && <><button onClick={() => void updateMember(member, { status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} className="text-blue-700 hover:underline">{member.status === "ACTIVE" ? "Desativar" : "Ativar"}</button><button onClick={() => setRemoving(member)} className="text-red-700 hover:underline">Remover</button></>}</td></tr>)}
      </tbody></table>
      {loading && <p className="p-6 text-center text-gray-500">Carregando equipe...</p>}{!loading && members.length === 0 && <p className="p-6 text-center text-gray-500">Nenhum usuário vinculado.</p>}
    </section>

    {removing && <div role="dialog" aria-modal="true" aria-labelledby="remove-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="remove-title" className="text-lg font-bold">Remover acesso?</h2><p className="mt-2 text-gray-600">{removing.user.name} não poderá mais acessar esta unidade. A conta pessoal não será excluída.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setRemoving(null)} className="rounded-md border px-4 py-2">Cancelar</button><button onClick={() => void confirmRemoval()} className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white">Remover acesso</button></div></section></div>}
  </div>;
}

export function UsersScreen() { return <PageLayout title="Equipe e acessos" image="/logoClaraEscrita.png"><TeamManager /></PageLayout>; }
