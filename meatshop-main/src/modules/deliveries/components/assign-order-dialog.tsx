"use client";

import { Truck } from "lucide-react";
import { FormDialog, FormField, FormSection } from "@/shared/components/form-dialog";

export function AssignOrderDialog({ orderId, people, selectedId, onSelect, busy, onClose, onAssign }: {
  orderId?: number;
  people: { deliveryPersonId?: number | null; user: { name: string } }[];
  selectedId: string;
  onSelect: (value: string) => void;
  busy: boolean;
  onClose: () => void;
  onAssign: () => void;
}) {
  return <FormDialog open={orderId != null} onOpenChange={open => { if (!open) onClose(); }} title={`Atribuir pedido #${orderId ?? ""}`} description="Escolha quem fará a entrega. O entregador receberá um código exclusivo para apresentar na retirada." icon={Truck} saving={busy} submitDisabled={!selectedId || !people.some(person => String(person.deliveryPersonId) === selectedId)} submitLabel="Atribuir pedido" onSubmit={event => { event.preventDefault(); if (selectedId && people.some(person => String(person.deliveryPersonId) === selectedId)) onAssign(); }}>
    <FormSection title="Responsável pela entrega" description="Somente entregadores aprovados e disponíveis aparecem nesta lista.">
      <FormField label="Entregador" required className="sm:col-span-2">
        <select required value={selectedId} onChange={event => onSelect(event.target.value)} className="input" disabled={!people.length}>
          <option value="">Selecione um entregador disponível</option>
          {people.map(person => <option key={person.deliveryPersonId} value={person.deliveryPersonId ?? ""}>{person.user.name}</option>)}
        </select>
      </FormField>
      {!people.length && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">Não há entregadores aprovados e disponíveis. Confira a equipe antes de atribuir o pedido.</p>}
    </FormSection>
  </FormDialog>;
}
