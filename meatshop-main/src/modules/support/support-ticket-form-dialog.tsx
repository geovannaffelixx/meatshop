"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LifeBuoy } from "lucide-react";
import { FormDialog, FormSection } from "@/shared/components/form-dialog";
import { RequiredMark } from "@/shared/components/ui/required-mark";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { apiPost, apiUpload } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { categoryLabels, priorityLabels, type SupportCategory, type SupportPriority } from "./types";

const initialForm = {
  subject: "",
  description: "",
  category: "TECHNICAL" as SupportCategory,
  priority: "NORMAL" as SupportPriority,
  order_id: "",
};

export function SupportTicketFormDialog({ open, setOpen, unitId }: { open: boolean; setOpen: (open: boolean) => void; unitId: number | null }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const ticket = await apiPost("/support-tickets", {
        ...form,
        unit_id: unitId ?? undefined,
        order_id: form.order_id ? Number(form.order_id) : undefined,
      });
      if (images.length) {
        const data = new FormData();
        images.forEach((image) => data.append("images", image));
        await apiUpload(`/support-tickets/${ticket.id}/messages`, data);
      }
      toast.success("Chamado enviado para a equipe MeatShop.");
      setOpen(false);
      router.push(`/support/${ticket.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível enviar o chamado. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return <FormDialog open={open} onOpenChange={setOpen} title="Novo chamado" description="Conte o que aconteceu para que a equipe MeatShop possa ajudar." icon={LifeBuoy} saving={saving} submitLabel="Enviar chamado" onSubmit={createTicket} error={formError}>
    <FormSection title="Detalhes do atendimento" description="Informe o assunto, a categoria e os detalhes que ajudam a entender sua solicitação.">
      <div className="space-y-4 sm:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Categoria<RequiredMark />
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value as SupportCategory,
                    })
                  }
                  className="input mt-1"
                  required
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Prioridade
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority: event.target.value as SupportPriority,
                    })
                  }
                  className="input mt-1"
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              Assunto<RequiredMark />
              <Input
                required
                maxLength={150}
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                className="mt-1"
                placeholder="Ex.: Dúvida sobre um pedido"
              />
            </label>
            <label className="block text-sm font-medium">
              Descrição (opcional)
              <Textarea
                maxLength={2000}
                rows={6}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1"
                placeholder="Ex.: Informe os detalhes que podem ajudar no atendimento."
              />
            </label>
            <label className="block text-sm font-medium">
              Pedido relacionado (opcional)
              <Input
                type="number"
                min={1}
                value={form.order_id}
                onChange={(event) =>
                  setForm({ ...form, order_id: event.target.value })
                }
                className="mt-1"
                placeholder="Ex.: 1234"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:bg-slate-50">
              <ImagePlus className="size-5" />
              {images.length
                ? `${images.length} imagem(ns) selecionada(s)`
                : "Adicionar até 4 imagens"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []).slice(0, 4))
                }
              />
            </label>
            {images.length > 0 && (
              <p className="text-xs text-slate-500">
                {images.map(({ name }) => name).join(", ")}
              </p>
            )}
      </div>
    </FormSection>
  </FormDialog>;
}
