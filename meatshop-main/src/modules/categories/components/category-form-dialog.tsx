"use client";

import type { Dispatch, SetStateAction } from "react";
import { Tags } from "lucide-react";
import {
  FormActiveToggle,
  FormDialog,
  FormField,
  FormSection,
} from "@/shared/components/form-dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

export type CategoryFormState = { name: string; description: string; active: boolean };

export function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  error,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: CategoryFormState;
  setForm: Dispatch<SetStateAction<CategoryFormState>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Tags}
      title={editing ? "Editar categoria" : "Nova categoria"}
      description="Organize os produtos para facilitar a navegação dos clientes."
      saving={saving}
      error={error}
      submitLabel={editing ? "Salvar alterações" : "Criar categoria"}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <FormSection title="Informações da categoria">
        <FormField label="Nome" required className="sm:col-span-2">
          <Input
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex.: Cortes bovinos"
          />
        </FormField>
        <FormField
          label="Descrição (opcional)"
          className="sm:col-span-2"
          hint="Uma descrição curta ajuda a identificar os produtos desta categoria."
        >
          <Textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
            placeholder="Ex.: Cortes selecionados de carne bovina."
          />
        </FormField>
      </FormSection>
      <FormActiveToggle
        checked={form.active}
        onChange={(active) => setForm((current) => ({ ...current, active }))}
        label="Categoria ativa"
        description="Deixe ativa para disponibilizar a categoria na organização do catálogo."
      />
    </FormDialog>
  );
}
