"use client";

import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { DataPagination } from "@/shared/components/data-pagination";
import { SearchField } from "@/shared/components/search-field";
import { Button } from "@/shared/components/ui/button";
import { useServerList } from "@/shared/hooks/use-server-list";
import type { UnitDeliveryPerson } from "../types";

export function DeliveryPeopleTable({
  unitId,
  canManage,
  busy,
  onApprove,
}: {
  unitId: number;
  canManage: boolean;
  busy: boolean;
  onApprove: (person: UnitDeliveryPerson) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const query = useServerList<UnitDeliveryPerson>(`/delivery/units/${unitId}/people`, search);
  const { refetch } = query;
  useEffect(() => {
    const timer = window.setInterval(() => void refetch(), 30_000);
    return () => window.clearInterval(timer);
  }, [refetch]);
  const columns: TableColumn<UnitDeliveryPerson>[] = [
    {
      id: "name",
      header: "Entregador",
      accessor: (person) => (
        <div>
          <strong className="font-semibold">{person.user.name}</strong>
          <p className="text-slate-500">{person.user.email}</p>
        </div>
      ),
    },
    {
      id: "profile",
      header: "Perfil",
      accessor: (person) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${person.profileStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : person.profileStatus === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
        >
          {person.profileStatus === "ACTIVE"
            ? "Aprovado"
            : person.profileStatus === "PENDING"
              ? "Pendente"
              : person.profileStatus === "NOT_REGISTERED"
                ? "Não cadastrado"
                : "Inativo"}
        </span>
      ),
    },
    {
      id: "vehicle",
      header: "Veículo",
      accessor: (person) =>
        person.vehicle
          ? `${person.vehicle.model} · ${person.vehicle.plate}`
          : person.deliveryPersonId
            ? person.profileStatus === "PENDING"
              ? "Cadastro inicial"
              : "Sem veículo ativo"
            : "Não cadastrado",
    },
    {
      id: "operation",
      header: "Operação",
      accessor: (person) =>
        person.activeOrderId
          ? `Pedido #${person.activeOrderId}`
          : !person.isOnline
            ? "Offline"
            : !person.vehicle
              ? "Sem veículo ativo"
              : "Disponível",
    },
    {
      id: "actions",
      header: "Ações",
      textAlign: "end",
      accessor: (person) =>
        canManage && person.profileStatus === "PENDING" && person.deliveryPersonId ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void onApprove(person).then(() => refetch())}
          >
            Aprovar
          </Button>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-red-50 p-2 text-red-700">
          <UsersRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Entregadores da unidade</h2>
          <p className="text-sm text-slate-600">Aprove cadastros antes de atribuir pedidos.</p>
        </div>
      </div>
      <SearchField
        value={search}
        onValueChange={setSearch}
        label="Buscar entregadores"
        placeholder="Buscar por nome ou e-mail"
        className="max-w-xl"
      />
      {query.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {query.error.message}
          <Button variant="outline" className="ml-3" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ReusableTable
          data={query.rows}
          columns={columns}
          caption="Entregadores da unidade"
          keyExtractor={(person) => person.membershipId}
          isLoading={query.isPending}
          emptyMessage={
            search
              ? "Nenhum entregador encontrado para esta busca."
              : "Nenhum entregador vinculado. Cadastre um em Equipe e acessos."
          }
          footer={<DataPagination {...query.pagination} isLoading={query.isFetching} />}
        />
      )}
    </section>
  );
}
