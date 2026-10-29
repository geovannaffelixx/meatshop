"use client";

import { VEHICLE_TYPES, type VehicleType } from "@/shared/lib/vehicle-types";

import { maskCPF } from "@/shared/lib/input-masks";
import { validateName, validateEmail, validateCPF, validatePassword } from "@/shared/lib/validators";

import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { DataPagination } from "@/shared/components/data-pagination";
import { useServerList } from "@/shared/hooks/use-server-list";
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header";




import { useState } from "react";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Spinner } from "@/shared/components/ui/spinner";
import { RequiredMark } from "@/shared/components/ui/required-mark";
import { apiDelete, apiPatch, apiPost } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type Role = "OWNER" | "MANAGER" | "OPERATOR" | "DELIVERY";
type Member = {
  id: number;
  user: { id: number; name: string; email: string };
  local_role: Role;
  status: "ACTIVE" | "INACTIVE";
};
type NewMember = {
  name: string;
  email: string;
  cpf: string;
  password: string;
  local_role: "MANAGER" | "OPERATOR" | "DELIVERY";
  vehicle: VehicleType;
};

const emptyMember: NewMember = {
  name: "",
  email: "",
  cpf: "",
  password: "",
  local_role: "OPERATOR",
  vehicle: "MOTORCYCLE",
};
const labels: Record<Role, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
  DELIVERY: "Entregador",
};

function TeamManager() {
  const { unitId, selectedMembership } = usePanelAccess();
  const [form, setForm] = useState<NewMember>(emptyMember);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const canAssignManager =
    selectedMembership?.role === "OWNER" || selectedMembership?.role === null;

  const [search, setSearch] = useState('');
  const query = useServerList<Member>(unitId ? `/units/${unitId}/members` : null, search);
  const { isPending: loading, refetch: load, error, pagination } = query;

  async function createMember(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId) return;
    const validationError = !validateName(form.name) ? 'Informe um nome válido.' : !validateEmail(form.email) ? 'Informe um e-mail válido.' : !validateCPF(form.cpf) ? 'Informe um CPF válido.' : !validatePassword(form.password) ? 'Use senha de 8 a 64 caracteres com maiúscula, minúscula, número e especial.' : null;
    if (validationError) { toast.warning(validationError); return; }
    setSaving(true);
    try {
      await apiPost(`/units/${unitId}/members/create`, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        cpf: form.cpf.replace(/\D/g, ""),
        vehicle: form.local_role === "DELIVERY" ? form.vehicle : undefined,
      });
      setForm(emptyMember);
      toast.success("Usuário criado e adicionado à equipe.");
      await load();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(
    member: Member,
    changes: Partial<Pick<Member, "local_role" | "status">>,
  ) {
    if (!unitId || busyId) return;
    setBusyId(member.id);
    try {
      await apiPatch(`/units/${unitId}/members/${member.id}`, changes);
      toast.success("Acesso atualizado.");
      await load();
    } catch {
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemoval() {
    if (!unitId || !removing) return;
    setConfirmingRemoval(true);
    try {
      await apiDelete(`/units/${unitId}/members/${removing.id}`);
      toast.success("Usuário removido da equipe.");
      setRemoving(null);
      await load();
    } catch {
    } finally {
      setConfirmingRemoval(false);
    }
  }

  const input = (key: keyof NewMember, label: string, type = "text") => (
    <label className="text-sm font-medium text-gray-700">
      {label}<RequiredMark />
      {type === "password" ? (
        <PasswordInput
          value={form[key]}
          onChange={(event) =>
            setForm((current) => ({ ...current, [key]: key === "cpf" ? maskCPF(event.target.value) : event.target.value }))
          }
          className="mt-1 w-full"
          placeholder="Digite uma senha temporária"
          required
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(event) =>
            setForm((current) => ({ ...current, [key]: key === "cpf" ? maskCPF(event.target.value) : event.target.value }))
          }
          className="input mt-1"
          placeholder={key === "name" ? "Ex.: João da Silva" : key === "email" ? "nome@empresa.com.br" : "000.000.000-00"}
          required
        />
      )}
    </label>
  );

  const columns: TableColumn<Member>[] = [
    { id: 'user', header: 'Usuário', accessor: row => <><strong>{row.user.name}</strong><div className="text-slate-500">{row.user.email}</div></> },
    { id: 'role', header: 'Cargo', accessor: row => row.local_role === 'OWNER' || row.local_role === 'DELIVERY' ? labels[row.local_role] : <select aria-label={`Cargo de ${row.user.name}`} value={row.local_role} disabled={busyId === row.id} onChange={event => void updateMember(row, { local_role: event.target.value as 'MANAGER' | 'OPERATOR' })} className="rounded-lg border px-2 py-1"><option value="OPERATOR">Operador</option>{canAssignManager && <option value="MANAGER">Gerente</option>}</select> },
    { id: 'status', header: 'Status', accessor: row => <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span> },
    { id: 'actions', header: 'Ações', textAlign: 'end', accessor: row => row.local_role !== 'OWNER' && <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" size="sm" disabled={busyId === row.id} onClick={() => void updateMember(row, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{busyId === row.id ? 'Atualizando...' : row.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}</Button>
      <Button type="button" variant="ghost" size="sm" disabled={busyId === row.id} onClick={() => setRemoving(row)}>Remover</Button>
    </div> },
  ];

  return (
    <div className="page-surface">
    <div className="page-container">
      <PageHeader eyebrow="Configurações" title="Equipe e acessos" description="Crie contas para funcionários e determine o que cada pessoa pode administrar nesta unidade." />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Novo integrante</h2>
        <form
          onSubmit={createMember}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          {input("name", "Nome completo")}
          {input("email", "E-mail", "email")}
          {input("cpf", "CPF")}
          {input("password", "Senha temporária", "password")}
          <label className="text-sm font-medium text-gray-700">
            Cargo<RequiredMark />
            <select
              value={form.local_role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  local_role: event.target.value as NewMember["local_role"],
                }))
              }
              className="input mt-1"
              required
            >
              <option value="OPERATOR">Operador</option>
              <option value="DELIVERY">Entregador</option>
              {canAssignManager && <option value="MANAGER">Gerente</option>}
            </select>
          </label>
          {form.local_role === "DELIVERY" && (
            <label className="text-sm font-medium text-gray-700">
              Modalidade<RequiredMark />
              <select
                value={form.vehicle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vehicle: event.target.value as NewMember["vehicle"],
                  }))
                }
                className="input mt-1"
                required
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={saving}

            >
              {saving && <Spinner />}
              {saving ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          A senha é temporária e deve ser entregue ao usuário por um canal
          seguro. Ele poderá alterá-la em Segurança.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Usuários vinculados</h2>
          <p className="text-sm text-gray-500">
            Proprietários não podem ser removidos nem ter o cargo alterado.
          </p>
        </div>
        <SearchField value={search} onValueChange={setSearch} label="Buscar equipe" placeholder="Buscar por nome ou e-mail" className="mb-4 max-w-xl" />
        <ReusableTable data={query.rows} columns={columns} caption="Equipe e acessos" keyExtractor={row => row.id} isLoading={loading} emptyMessage="Nenhum usuário vinculado." footer={<DataPagination {...pagination} isLoading={loading} />} />
        {error && <p role="alert" className="p-6 text-red-700">{error.message}</p>}
      </section>

      <Dialog open={Boolean(removing)} onOpenChange={(nextOpen) => !nextOpen && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover acesso?</DialogTitle>
            <DialogDescription>
              {removing?.user.name} não poderá mais acessar esta unidade. A conta pessoal não será excluída.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={confirmingRemoval} onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={confirmingRemoval} onClick={() => void confirmRemoval()}>
              {confirmingRemoval && <Spinner />}
              {confirmingRemoval ? "Removendo..." : "Remover acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

export function UsersScreen() {
  return <TeamManager />;
}
