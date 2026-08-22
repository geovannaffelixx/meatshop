"use client";

import { useCallback, useEffect, useState } from "react";
import PageLayout from "@/shared/components/page-layout";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

type Member = {
  id: number;
  user: { id: number; name: string; email: string };
  local_role: "OWNER" | "MANAGER" | "OPERATOR";
  status: "ACTIVE" | "INACTIVE";
};

const roleLabels = { OWNER: "Proprietário", MANAGER: "Gerente", OPERATOR: "Operador" };

function MembersManager() {
  const { unitId, selectedMembership } = usePanelAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"MANAGER" | "OPERATOR">("OPERATOR");
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try { setMembers(await apiGet(`/units/${unitId}/members`)); }
    finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId || !Number(userId)) return toast.warning("Informe um ID de usuário válido.");
    try {
      await apiPost(`/units/${unitId}/members`, { user_id: Number(userId), local_role: role });
      setUserId("");
      toast.success("Usuário adicionado à unidade.");
      await loadMembers();
    } catch { /* O cliente da API exibe o erro traduzido. */ }
  }

  async function updateMember(member: Member, changes: Partial<Pick<Member, "local_role" | "status">>) {
    if (!unitId) return;
    try {
      await apiPatch(`/units/${unitId}/members/${member.id}`, changes);
      toast.success("Acesso atualizado.");
      await loadMembers();
    } catch { /* O cliente da API exibe o erro traduzido. */ }
  }

  async function removeMember(member: Member) {
    if (!unitId || !window.confirm(`Remover o acesso de ${member.user.name}?`)) return;
    try {
      await apiDelete(`/units/${unitId}/members/${member.id}`);
      toast.success("Acesso removido.");
      await loadMembers();
    } catch { /* O cliente da API exibe o erro traduzido. */ }
  }

  const canAssignManager = selectedMembership?.role === "OWNER" || selectedMembership?.role === null;

  return <div className="space-y-6 p-6">
    <section className="rounded-lg border bg-white p-5">
      <h1 className="text-xl font-semibold text-gray-900">Usuários da unidade</h1>
      <p className="mt-1 text-sm text-gray-600">Conceda acesso administrativo usando o ID de uma conta já cadastrada.</p>
      <form onSubmit={addMember} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-medium text-gray-700">ID do usuário<input value={userId} onChange={(event) => setUserId(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border px-3 py-2" placeholder="Ex.: 42" /></label>
        <label className="text-sm font-medium text-gray-700">Função<select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="mt-1 block rounded-md border px-3 py-2"><option value="OPERATOR">Operador</option>{canAssignManager && <option value="MANAGER">Gerente</option>}</select></label>
        <button disabled={loading} className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">Adicionar</button>
      </form>
    </section>
    <section className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="p-3">Usuário</th><th className="p-3">Função</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead>
        <tbody>{members.map((member) => <tr key={member.id} className="border-b last:border-0"><td className="p-3"><div className="font-medium">{member.user.name}</div><div className="text-gray-500">{member.user.email} · ID {member.user.id}</div></td><td className="p-3">{member.local_role === "OWNER" ? roleLabels.OWNER : <select aria-label={`Função de ${member.user.name}`} value={member.local_role} onChange={(event) => updateMember(member, { local_role: event.target.value as "MANAGER" | "OPERATOR" })} className="rounded border px-2 py-1"><option value="OPERATOR">Operador</option>{canAssignManager && <option value="MANAGER">Gerente</option>}</select>}</td><td className="p-3"><span className={member.status === "ACTIVE" ? "text-green-700" : "text-gray-500"}>{member.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></td><td className="space-x-3 p-3 text-right">{member.local_role !== "OWNER" && <><button onClick={() => updateMember(member, { status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} className="text-blue-700 hover:underline">{member.status === "ACTIVE" ? "Desativar" : "Ativar"}</button><button onClick={() => removeMember(member)} className="text-red-700 hover:underline">Remover</button></>}</td></tr>)}</tbody>
      </table>
      {!loading && members.length === 0 && <p className="p-6 text-center text-gray-500">Nenhum usuário vinculado.</p>}
      {loading && <p className="p-6 text-center text-gray-500">Carregando usuários...</p>}
    </section>
  </div>;
}

export function UsersScreen() {
  return <PageLayout title="Usuários" image="/logoClaraEscrita.png"><MembersManager /></PageLayout>;
}
