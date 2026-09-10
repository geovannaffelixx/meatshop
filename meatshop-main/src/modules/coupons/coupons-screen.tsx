"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, History, Plus, Search, TicketPercent } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatters";
import { toast } from "@/shared/lib/toast";
import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { DataPagination } from "@/shared/components/data-pagination";
import type {
  Coupon,
  CouponResult,
  CouponType,
  DiscountType,
  Redemption,
} from "./types";

type FormState = {
  code: string;
  name: string;
  description: string;
  type: CouponType;
  unit_id: string;
  allowed_unit_ids: number[];
  discount_type: DiscountType;
  discount_amount: string;
  maximum_discount: string;
  minimum_order_value: string;
  starts_at: string;
  expires_at: string;
  total_usage_limit: string;
  usage_limit_per_user: string;
  active: boolean;
};

const emptyForm: FormState = {
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
  const [result, setResult] = useState<CouponResult>({
    data: [],
    meta: { page: 1, total: 0, totalPages: 1 },
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{
    coupon: Coupon;
    items: Redemption[];
  } | null>(null);

  const query = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(!isAdmin && unitId ? { unit_id: String(unitId) } : {}),
      }).toString(),
    [isAdmin, page, search, unitId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await apiGet(`/coupons?${query}`, { silent: true }));
    } catch {
      toast.error("Não foi possível carregar os cupons.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (isAdmin || unitId) void load();
  }, [isAdmin, load, unitId]);

  function startCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      type: isAdmin ? "PLATFORM" : "UNIT",
      unit_id: !isAdmin && unitId ? String(unitId) : "",
    });
    setFormOpen(true);
  }

  function startEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm(toForm(coupon));
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (new Date(form.expires_at) <= new Date(form.starts_at)) {
      toast.warning("O término deve ser posterior ao início do cupom.");
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
    } catch {
      return;
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
  const usageOnPage = result.data.reduce(
    (total, coupon) => total + coupon.current_usage_count,
    0,
  );

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
          <label className="relative block max-w-xl">
            <span className="sr-only">Buscar cupons</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por código ou nome"
              className="pl-9"
            />
          </label>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
              <Spinner />
              Carregando cupons...
            </div>
          ) : result.data.length === 0 ? (
            <EmptyState
              icon={TicketPercent}
              title="Nenhum cupom encontrado"
              description={
                search
                  ? "Tente buscar por outro código ou nome."
                  : "Crie o primeiro cupom para oferecer um benefício aos clientes."
              }
              action={
                !search ? (
                  <Button onClick={startCreate}>
                    <Plus />
                    Novo cupom
                  </Button>
                ) : undefined
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
                pageSize={20}
                totalItems={result.meta.total}
                totalPages={result.meta.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>

      <CouponForm
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        units={units}
        isAdmin={isAdmin}
        editing={editing}
        saving={saving}
        onSave={save}
      />
      <HistoryDialog data={history} onClose={() => setHistory(null)} />
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
            enabled
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {expired ? "Expirado" : coupon.active ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {coupon.active ? "Desativar" : "Ativar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onHistory}>Usos</Button>
        </div>
      </td>
    </tr>
  );
}

function CouponForm({
  open,
  onOpenChange,
  form,
  setForm,
  units,
  isAdmin,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  units: Array<{ id: number; name: string }>;
  isAdmin: boolean;
  editing: Coupon | null;
  saving: boolean;
  onSave: (event: React.FormEvent) => void;
}) {
  const update = <Key extends keyof FormState,>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <form onSubmit={onSave} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle>
            <DialogDescription>
              Defina o escopo, o benefício, a validade e os limites de utilização.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código">
              <Input
                required
                disabled={Boolean(editing)}
                value={form.code}
                onChange={(event) => update("code", event.target.value.toUpperCase())}
                pattern="[A-Za-z0-9_-]+"
              />
            </Field>
            <Field label="Nome">
              <Input required value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={3}
                className="input h-auto resize-y"
              />
            </Field>

            {isAdmin && (
              <Field label="Tipo">
                <select
                  value={form.type}
                  onChange={(event) => {
                    update("type", event.target.value as CouponType);
                    update("unit_id", "");
                    update("allowed_unit_ids", []);
                  }}
                  className="input"
                >
                  <option value="PLATFORM">Plataforma</option>
                  <option value="UNIT">Unidade</option>
                </select>
              </Field>
            )}

            {form.type === "UNIT" && (
              <Field label="Unidade">
                <select
                  required
                  value={form.unit_id}
                  disabled={!isAdmin}
                  onChange={(event) => update("unit_id", event.target.value)}
                  className="input"
                >
                  <option value="">Selecione</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </Field>
            )}

            {form.type === "PLATFORM" && (
              <div className="sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Unidades permitidas</span>
                <p className="mb-2 text-xs text-slate-500">Sem seleção, o cupom será válido em todas as unidades.</p>
                <div className="grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                  {units.map((unit) => (
                    <label key={unit.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.allowed_unit_ids.includes(unit.id)}
                        onChange={() =>
                          update(
                            "allowed_unit_ids",
                            form.allowed_unit_ids.includes(unit.id)
                              ? form.allowed_unit_ids.filter((id) => id !== unit.id)
                              : [...form.allowed_unit_ids, unit.id],
                          )
                        }
                      />
                      {unit.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Field label="Modalidade">
              <select
                value={form.discount_type}
                onChange={(event) => {
                  update("discount_type", event.target.value as DiscountType);
                  update("maximum_discount", "");
                }}
                className="input"
              >
                <option value="PERCENTAGE">Percentual</option>
                <option value="FIXED">Valor fixo</option>
              </select>
            </Field>
            <Field label={form.discount_type === "PERCENTAGE" ? "Desconto (%)" : "Desconto (R$)"}>
              <Input
                required
                type="number"
                min="0.01"
                max={form.discount_type === "PERCENTAGE" ? 100 : undefined}
                step="0.01"
                value={form.discount_amount}
                onChange={(event) => update("discount_amount", event.target.value)}
              />
            </Field>
            {form.discount_type === "PERCENTAGE" && (
              <Field label="Teto do desconto (R$)">
                <Input type="number" min="0.01" step="0.01" value={form.maximum_discount} onChange={(event) => update("maximum_discount", event.target.value)} />
              </Field>
            )}
            <Field label="Pedido mínimo (R$)">
              <Input type="number" min="0" step="0.01" value={form.minimum_order_value} onChange={(event) => update("minimum_order_value", event.target.value)} />
            </Field>
            <Field label="Limite total">
              <Input type="number" min="1" value={form.total_usage_limit} onChange={(event) => update("total_usage_limit", event.target.value)} />
            </Field>
            <Field label="Limite por cliente">
              <Input type="number" min="1" value={form.usage_limit_per_user} onChange={(event) => update("usage_limit_per_user", event.target.value)} />
            </Field>
            <Field label="Início">
              <Input required type="datetime-local" value={form.starts_at} onChange={(event) => update("starts_at", event.target.value)} />
            </Field>
            <Field label="Término">
              <Input required type="datetime-local" value={form.expires_at} onChange={(event) => update("expires_at", event.target.value)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} />
            Cupom ativo
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={saving}>
              {saving && <Spinner />}
              {saving ? "Salvando..." : "Salvar cupom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function HistoryDialog({
  data,
  onClose,
}: {
  data: { coupon: Coupon; items: Redemption[] } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(data)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Utilizações de {data?.coupon.code}</DialogTitle>
          <DialogDescription>Até 500 registros mais recentes.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Histórico de utilizações do cupom</caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Cliente</th>
                <th scope="col">Unidade</th>
                <th scope="col">Pedido</th>
                <th scope="col">Desconto</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {!data?.items.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Ainda não utilizado.</td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.redeemed_at).toLocaleString("pt-BR")}</td>
                    <td>{item.user?.name ?? "Não identificado"}</td>
                    <td>{item.unit?.name ?? "Não identificada"}</td>
                    <td>#{item.order_id}</td>
                    <td>{formatCurrency(Number(item.discount_amount))}</td>
                    <td>{item.status === "REDEEMED" ? "Utilizado" : "Liberado"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toPayload(form: FormState, isAdmin: boolean, editing: boolean) {
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
    starts_at: new Date(form.starts_at).toISOString(),
    expires_at: new Date(form.expires_at).toISOString(),
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

function toLocal(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toForm(coupon: Coupon): FormState {
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
