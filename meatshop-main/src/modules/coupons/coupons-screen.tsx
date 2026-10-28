"use client";

import {
  toDatetimeLocal as toLocal,
  datetimeLocalToISO,
  validateDateRange,
} from "@/shared/lib/date-time";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useApiQuery } from "@/shared/hooks/use-api-query";

import { CouponFormDialog, type CouponFormState } from "./coupon-form-dialog";
import { useMemo, useState } from "react";
import { BadgePercent, History, Plus, TicketPercent } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatters";
import { toast } from "@/shared/lib/toast";
import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { Button } from "@/shared/components/ui/button";
import { CouponHistoryDialog } from "./coupon-history-dialog";
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { DataPagination } from "@/shared/components/data-pagination";
import type { Coupon, CouponResult, Redemption } from "./types";

const emptyForm: CouponFormState = {
  code: "",
  name: "",
  description: "",
  type: "UNIT",
  unit_id: "",
  allowed_unit_ids: [],
  discount_type: "PERCENTAGE",
  discount_amount: "",
  maximum_discount: "",
  minimum_order_value: "0",
  starts_at: "",
  expires_at: "",
  total_usage_limit: "",
  usage_limit_per_user: "1",
  active: true,
};

export function CouponsScreen() {
  const { user, unitId } = usePanelAccess();
  const { units } = useManagedUnits();
  const isAdmin = user?.global_role === "SUPER_ADMIN";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    coupon: Coupon;
    items: Redemption[];
  } | null>(null);

  const query = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(search ? { search } : {}),
        ...(!isAdmin && unitId ? { unit_id: String(unitId) } : {}),
      }).toString(),
    [isAdmin, page, search, unitId],
  );

  const {
    data: result = { data: [], meta: { page: 1, total: 0, totalPages: 1 } },
    isPending: loading,
    refetch: load,
  } = useApiQuery<CouponResult>(isAdmin || unitId ? `/coupons?${query}` : null);

  function startCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      type: isAdmin ? "PLATFORM" : "UNIT",
      unit_id: !isAdmin && unitId ? String(unitId) : "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function startEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm(toForm(coupon));
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);
    if (!validateDateRange(form.starts_at, form.expires_at)) {
      setFormError("O término deve ser posterior ao início do cupom.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form, isAdmin, Boolean(editing));
      if (editing) {
        await apiPatch(`/coupons/${editing.id}`, payload);
      } else {
        await apiPost("/coupons", payload);
      }
      toast.success(editing ? "Cupom atualizado." : "Cupom criado.");
      setFormOpen(false);
      await load();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o cupom. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(coupon: Coupon) {
    try {
      await apiPatch(`/coupons/${coupon.id}`, { active: !coupon.active });
      toast.success(coupon.active ? "Cupom desativado." : "Cupom ativado.");
      await load();
    } catch {
      return;
    }
  }

  async function showHistory(coupon: Coupon) {
    try {
      const items = await apiGet(`/coupons/${coupon.id}/redemptions`);
      setHistory({ coupon, items: Array.isArray(items) ? items : [] });
    } catch {
      return;
    }
  }

  const activeOnPage = result.data.filter(
    (coupon) => coupon.active && new Date(coupon.expires_at) > new Date(),
  ).length;
  const usageOnPage = result.data.reduce((total, coupon) => total + coupon.current_usage_count, 0);

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Marketing"
          title="Cupons"
          description={
            isAdmin
              ? "Gerencie campanhas globais e benefícios disponíveis para as unidades."
              : "Crie e acompanhe os cupons da unidade selecionada."
          }
          actions={
            <Button onClick={startCreate}>
              <Plus />
              Novo cupom
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Cadastrados" value={result.meta.total} icon={TicketPercent} />
          <Metric label="Ativos nesta página" value={activeOnPage} icon={BadgePercent} />
          <Metric label="Usos nesta página" value={usageOnPage} icon={History} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SearchField
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            label="Buscar cupons"
            placeholder="Buscar por código ou nome"
            className="max-w-xl"
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <DataSkeleton label="Carregando cupons..." />
          ) : result.data.length === 0 ? (
            <EmptyState
              icon={TicketPercent}
              title="Nenhum cupom encontrado"
              description={
                search
                  ? "Tente buscar por outro código ou nome."
                  : "Crie o primeiro cupom para oferecer um benefício aos clientes."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <caption className="sr-only">Cupons cadastrados</caption>
                  <thead>
                    <tr>
                      <th scope="col">Cupom</th>
                      <th scope="col">Escopo</th>
                      <th scope="col">Desconto</th>
                      <th scope="col">Validade</th>
                      <th scope="col">Utilizações</th>
                      <th scope="col">Status</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((coupon) => (
                      <CouponRow
                        key={coupon.id}
                        coupon={coupon}
                        onEdit={() => startEdit(coupon)}
                        onToggle={() => void toggle(coupon)}
                        onHistory={() => void showHistory(coupon)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <DataPagination
                page={page}
                pageSize={10}
                totalItems={result.meta.total}
                totalPages={result.meta.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>

      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        units={units}
        isAdmin={isAdmin}
        editing={editing}
        saving={saving}
        onSave={save}
        error={formError}
      />
      <CouponHistoryDialog data={history} onClose={() => setHistory(null)} />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof History;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="rounded-lg bg-red-50 p-2 text-red-700">
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <strong className="mt-3 block text-2xl text-slate-950">{value}</strong>
    </div>
  );
}

function CouponRow({
  coupon,
  onEdit,
  onToggle,
  onHistory,
}: {
  coupon: Coupon;
  onEdit: () => void;
  onToggle: () => void;
  onHistory: () => void;
}) {
  const expired = new Date(coupon.expires_at) <= new Date();
  const enabled = coupon.active && !expired;
  return (
    <tr>
      <td>
        <strong className="text-slate-900">{coupon.code}</strong>
        <span className="block text-xs text-slate-500">{coupon.name}</span>
      </td>
      <td>
        {coupon.type === "UNIT"
          ? coupon.unit?.name
          : coupon.allowed_units.length
            ? `${coupon.allowed_units.length} unidade(s)`
            : "Toda a plataforma"}
      </td>
      <td>
        {coupon.discount_type === "PERCENTAGE"
          ? `${coupon.discount_amount}%`
          : formatCurrency(Number(coupon.discount_amount))}
      </td>
      <td>{new Date(coupon.expires_at).toLocaleDateString("pt-BR")}</td>
      <td>
        {coupon.current_usage_count}
        {coupon.total_usage_limit ? ` / ${coupon.total_usage_limit}` : ""}
      </td>
      <td>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {expired ? "Expirado" : coupon.active ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {coupon.active ? "Desativar" : "Ativar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onHistory}>
            Usos
          </Button>
        </div>
      </td>
    </tr>
  );
}

function toPayload(form: CouponFormState, isAdmin: boolean, editing: boolean) {
  return {
    code: form.code,
    name: form.name,
    description: form.description || undefined,
    type: isAdmin ? form.type : "UNIT",
    unit_id: form.type === "UNIT" ? Number(form.unit_id) : undefined,
    allowed_unit_ids: form.type === "PLATFORM" ? form.allowed_unit_ids : undefined,
    discount_type: form.discount_type,
    discount_amount: Number(form.discount_amount),
    maximum_discount:
      form.discount_type === "PERCENTAGE"
        ? form.maximum_discount
          ? Number(form.maximum_discount)
          : editing
            ? null
            : undefined
        : undefined,
    minimum_order_value: Number(form.minimum_order_value || 0),
    starts_at: datetimeLocalToISO(form.starts_at),
    expires_at: datetimeLocalToISO(form.expires_at),
    total_usage_limit: form.total_usage_limit
      ? Number(form.total_usage_limit)
      : editing
        ? null
        : undefined,
    usage_limit_per_user: form.usage_limit_per_user
      ? Number(form.usage_limit_per_user)
      : editing
        ? null
        : undefined,
    active: form.active,
  };
}

function toForm(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? "",
    type: coupon.type,
    unit_id: coupon.unit_id ? String(coupon.unit_id) : "",
    allowed_unit_ids: coupon.allowed_units.map((item) => item.unit_id),
    discount_type: coupon.discount_type,
    discount_amount: String(coupon.discount_amount),
    maximum_discount: coupon.maximum_discount ? String(coupon.maximum_discount) : "",
    minimum_order_value: String(coupon.minimum_order_value),
    starts_at: toLocal(coupon.starts_at),
    expires_at: toLocal(coupon.expires_at),
    total_usage_limit: coupon.total_usage_limit ? String(coupon.total_usage_limit) : "",
    usage_limit_per_user: coupon.usage_limit_per_user ? String(coupon.usage_limit_per_user) : "",
    active: coupon.active,
  };
}
