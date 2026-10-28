"use client";
import type { Dispatch, SetStateAction, FormEvent } from "react";
import { TicketPercent } from "lucide-react";
import {
  FormDialog,
  FormSection,
  FormField as Field,
  FormActiveToggle,
} from "@/shared/components/form-dialog";
import { Input } from "@/shared/components/ui/input";
import type { Coupon, CouponType, DiscountType } from "./types";

export type CouponFormState = {
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

export function CouponFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  units,
  isAdmin,
  editing,
  saving,
  onSave,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CouponFormState;
  setForm: Dispatch<SetStateAction<CouponFormState>>;
  units: Array<{ id: number; name: string }>;
  isAdmin: boolean;
  editing: Coupon | null;
  saving: boolean;
  error: string | null;
  onSave: (event: FormEvent) => void;
}) {
  const update = <Key extends keyof CouponFormState>(key: Key, value: CouponFormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={TicketPercent}
      title={editing ? "Editar cupom" : "Novo cupom"}
      description="Configure onde o cupom será aceito, o desconto e as regras de uso."
      saving={saving}
      submitLabel={editing ? "Salvar alterações" : "Criar cupom"}
      onSubmit={onSave}
      error={error}
    >
      <FormSection
        title="Identificação"
        description="O cliente usará o código abaixo para aplicar o benefício no pedido."
      >
        <Field
          label="Código"
          required
          hint={
            editing
              ? "O código não pode ser alterado após a criação."
              : "Use letras, números, hífen ou sublinhado, sem espaços."
          }
        >
          <Input
            autoFocus
            required
            disabled={Boolean(editing)}
            value={form.code}
            onChange={(event) => update("code", event.target.value.toUpperCase())}
            pattern="[A-Za-z0-9_-]+"
            placeholder="Ex.: BEMVINDO10"
          />
        </Field>
        <Field label="Nome" required>
          <Input
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ex.: Boas-vindas"
          />
        </Field>
        <Field label="Descrição (opcional)" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            rows={3}
            className="input h-auto resize-y"
            placeholder="Ex.: Desconto para a primeira compra."
          />
        </Field>
      </FormSection>
      <FormSection title="Onde pode ser usado">
        {isAdmin && (
          <Field label="Tipo" required>
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
          <Field label="Unidade" required>
            <select
              required
              value={form.unit_id}
              disabled={!isAdmin}
              onChange={(event) => update("unit_id", event.target.value)}
              className="input"
            >
              <option value="">Selecione</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.type === "PLATFORM" && (
          <div className="sm:col-span-2">
            <h3 className="text-sm font-medium text-slate-700">Unidades permitidas</h3>
            <p className="mb-2 text-xs text-slate-500">
              Sem seleção, o cupom será válido em todas as unidades.
            </p>
            {units.length === 0 && (
              <p className="mb-2 text-sm text-slate-600">
                Nenhuma unidade disponível para seleção. O cupom será válido em todas as unidades.
              </p>
            )}
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
      </FormSection>
      <FormSection
        title="Benefício"
        description="Defina o desconto e, se necessário, o valor mínimo do pedido."
      >
        <Field label="Modalidade" required>
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
        <Field
          label={form.discount_type === "PERCENTAGE" ? "Desconto (%)" : "Desconto (R$)"}
          required
        >
          <Input
            required
            type="number"
            min="0.01"
            max={form.discount_type === "PERCENTAGE" ? 100 : undefined}
            step="0.01"
            value={form.discount_amount}
            onChange={(event) => update("discount_amount", event.target.value)}
            placeholder={form.discount_type === "PERCENTAGE" ? "Ex.: 10" : "Ex.: 15,00"}
          />
        </Field>
        {form.discount_type === "PERCENTAGE" && (
          <Field label="Teto do desconto (R$)">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.maximum_discount}
              onChange={(event) => update("maximum_discount", event.target.value)}
            />
          </Field>
        )}
        <Field label="Pedido mínimo (R$)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.minimum_order_value}
            onChange={(event) => update("minimum_order_value", event.target.value)}
          />
        </Field>
      </FormSection>
      <FormSection
        title="Limites de utilização"
        description="Deixe em branco para não limitar o número de usos."
      >
        <Field label="Limite total" hint="Quantidade máxima de usos entre todos os clientes.">
          <Input
            type="number"
            min="1"
            value={form.total_usage_limit}
            onChange={(event) => update("total_usage_limit", event.target.value)}
          />
        </Field>
        <Field label="Limite por cliente" hint="Quantidade de usos permitidos para cada cliente.">
          <Input
            type="number"
            min="1"
            value={form.usage_limit_per_user}
            onChange={(event) => update("usage_limit_per_user", event.target.value)}
          />
        </Field>
      </FormSection>
      <FormSection
        title="Validade"
        description="Informe o período em que o cupom poderá ser utilizado, no horário de Brasília."
      >
        <Field label="Início" required>
          <Input
            required
            type="datetime-local"
            value={form.starts_at}
            onChange={(event) => update("starts_at", event.target.value)}
          />
        </Field>
        <Field label="Término" required>
          <Input
            required
            type="datetime-local"
            min={form.starts_at || undefined}
            value={form.expires_at}
            onChange={(event) => update("expires_at", event.target.value)}
          />
        </Field>
      </FormSection>

      <FormActiveToggle
        checked={form.active}
        onChange={(active) => update("active", active)}
        label="Cupom ativo"
        description="Cupons ativos podem ser utilizados durante a validade, respeitando as regras e os limites definidos."
      />
    </FormDialog>
  );
}
