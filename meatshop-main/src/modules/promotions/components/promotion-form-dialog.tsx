"use client";

import type { Dispatch, SetStateAction } from "react";
import { BadgePercent } from "lucide-react";
import { FormDialog, FormField, FormSection } from "@/shared/components/form-dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

export type PromotionProduct = { id: number; name: string; active: boolean };
export type PromotionFormState = {
  product_id: number;
  title: string;
  description: string;
  discountMode: "percentage" | "price";
  discount_percentage: string;
  promotional_price: string;
  starts_at: string;
  ends_at: string;
};

export function PromotionFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  products,
  saving,
  error,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: PromotionFormState;
  setForm: Dispatch<SetStateAction<PromotionFormState>>;
  products: PromotionProduct[];
  saving: boolean;
  error: string | null;
  onSave: () => void;
}) {
  const update = <K extends keyof PromotionFormState>(key: K, value: PromotionFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={BadgePercent}
      title={editing ? "Editar promoção" : "Nova promoção"}
      description="Escolha o produto, defina a oferta e programe a validade."
      saving={saving}
      error={error}
      submitLabel={editing ? "Salvar alterações" : "Criar promoção"}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <FormSection title="Produto e divulgação">
        <FormField
          label="Produto"
          required
          className="sm:col-span-2"
          hint={editing ? "O produto não pode ser alterado após a criação da promoção." : undefined}
        >
          <select
            autoFocus
            value={form.product_id}
            disabled={editing}
            required
            onChange={(event) => update("product_id", Number(event.target.value))}
            className="input"
          >
            <option value={0} disabled>
              Selecione um produto
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Título" required className="sm:col-span-2">
          <Input
            required
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ex.: Picanha em promoção"
          />
        </FormField>
        <FormField label="Descrição (opcional)" className="sm:col-span-2">
          <Textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            rows={3}
            placeholder="Ex.: Oferta válida enquanto durarem os estoques."
          />
        </FormField>
      </FormSection>
      <FormSection
        title="Benefício"
        description="Use um percentual sobre o preço original ou informe o preço final do produto."
      >
        <fieldset className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <legend className="sr-only">Tipo de desconto</legend>
          {(
            [
              ["percentage", "Desconto percentual"],
              ["price", "Preço promocional (R$)"],
            ] as const
          ).map(([mode, label]) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium ${form.discountMode === mode ? "border-red-700 bg-red-50 text-red-800" : "border-slate-200 text-slate-700"}`}
            >
              <input
                type="radio"
                name="promotion-discount"
                value={mode}
                checked={form.discountMode === mode}
                onChange={() => update("discountMode", mode)}
                className="size-4 accent-red-700"
              />
              {label}
            </label>
          ))}
        </fieldset>
        {form.discountMode === "percentage" ? (
          <FormField label="Desconto (%)" required className="sm:col-span-2">
            <Input
              required
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={form.discount_percentage}
              onChange={(event) => update("discount_percentage", event.target.value)}
              placeholder="Ex.: 20"
            />
          </FormField>
        ) : (
          <FormField label="Preço promocional (R$)" required className="sm:col-span-2">
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.promotional_price}
              onChange={(event) => update("promotional_price", event.target.value)}
              placeholder="Ex.: 69,90"
            />
          </FormField>
        )}
      </FormSection>
      <FormSection
        title="Período da promoção"
        description="A oferta será exibida durante o período definido, no horário de Brasília."
      >
        <FormField label="Início" required>
          <Input
            required
            type="datetime-local"
            value={form.starts_at}
            onChange={(event) => update("starts_at", event.target.value)}
          />
        </FormField>
        <FormField label="Término" required>
          <Input
            required
            type="datetime-local"
            min={form.starts_at || undefined}
            value={form.ends_at}
            onChange={(event) => update("ends_at", event.target.value)}
          />
        </FormField>
      </FormSection>
    </FormDialog>
  );
}
