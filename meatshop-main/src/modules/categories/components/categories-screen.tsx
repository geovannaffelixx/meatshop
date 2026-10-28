"use client";

import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { DataPagination } from "@/shared/components/data-pagination";
import { useServerList } from "@/shared/hooks/use-server-list";

import { CategoryFormDialog, type CategoryFormState } from "./category-form-dialog";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

import { Plus } from "lucide-react";
import { apiPatch, apiPost } from "@/shared/lib/api";
import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header";

import { toast } from "@/shared/lib/toast";

type Category = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  unit_id: number;
};

const EMPTY_FORM: CategoryFormState = { name: "", description: "", active: true };

export function CategoriesScreen() {
  const { units, unitId, loading: unitsLoading } = useManagedUnits();

  const [search, setSearch] = useState("");
  const query = useServerList<Category>(unitId ? `/categories?unit_id=${unitId}` : null, search);
  const pagination = query.pagination;
  const loading = query.isPending;
  const [actionError, setError] = useState<string | null>(null);
  const error = actionError ?? query.error?.message;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      active: category.active,
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      setFormError("Informe o nome da categoria.");
      return;
    }
    if (!unitId) {
      setFormError("Nenhuma unidade selecionada.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        active: form.active,
      };

      if (editingId) {
        await apiPatch(`/categories/${editingId}`, payload);
      } else {
        await apiPost("/categories", { ...payload, unit_id: unitId });
      }

      setOpen(false);
      await query.refetch();
      toast.success(editingId ? "Categoria atualizada." : "Categoria criada.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: Category) => {
    if (!unitId || togglingId) return;
    setTogglingId(category.id);
    try {
      await apiPatch(`/categories/${category.id}`, { active: !category.active });
      await query.refetch();
      toast.success(category.active ? "Categoria desativada." : "Categoria ativada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria.");
    } finally {
      setTogglingId(null);
    }
  };

  const columns: TableColumn<Category>[] = [
    { id: "name", header: "Nome", accessor: "name", className: "font-medium" },
    {
      id: "description",
      header: "Descrição",
      accessor: (row) => row.description ?? "—",
      className: "text-slate-600",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <span
          className={row.active ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}
        >
          {row.active ? "Ativa" : "Inativa"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      textAlign: "end",
      accessor: (row) => (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void toggleActive(row)}
            disabled={togglingId === row.id}
          >
            {togglingId === row.id ? "Atualizando..." : row.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Catálogo"
          title="Categorias"
          description="Organize os produtos em categorias fáceis de encontrar."
          actions={
            <Button type="button" onClick={openCreate}>
              <Plus size={18} />
              Nova categoria
            </Button>
          }
        />

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">
            Nenhuma unidade encontrada para este usuário.
          </div>
        )}

        <SearchField
          value={search}
          onValueChange={setSearch}
          label="Buscar categorias"
          placeholder="Buscar por nome ou descrição"
          className="max-w-xl"
        />

        {error ? (
          <div className="p-6 text-red-700" role="alert">
            {error}
            <button
              type="button"
              onClick={() => {
                setError(null);
                void query.refetch();
              }}
              className="ml-3 underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <ReusableTable
            data={query.rows}
            columns={columns}
            caption="Categorias cadastradas"
            keyExtractor={(row) => row.id}
            isLoading={loading}
            emptyMessage="Nenhuma categoria encontrada."
            footer={<DataPagination {...pagination} isLoading={loading} />}
          />
        )}
      </div>
      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={Boolean(editingId)}
        form={form}
        setForm={setForm}
        saving={saving}
        error={formError}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
