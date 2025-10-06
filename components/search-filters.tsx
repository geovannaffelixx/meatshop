"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Cliente {
  id: string
  nome: string
  cpf: string
}

interface SearchFiltersProps {
  value: Cliente
  status?: string
  onChange: (value: Cliente) => void
  onStatusChange?: (status: string) => void
}

export function SearchFilters({
  value,
  status = "",
  onChange,
  onStatusChange,
}: SearchFiltersProps) {
  const selectValue = status === "" ? "todos" : status

  const handleStatusChange = (v: string) => {
    onStatusChange?.(v === "todos" ? "" : v)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
      <Input
        placeholder="ID"
        value={value.id}
        onChange={(e) => onChange({ ...value, id: e.target.value })}
      />
      <Input
        placeholder="Nome"
        value={value.nome}
        onChange={(e) => onChange({ ...value, nome: e.target.value })}
      />
      <Input
        placeholder="CPF"
        value={value.cpf}
        onChange={(e) => onChange({ ...value, cpf: e.target.value })}
      />

      <Select value={selectValue} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="entregue">Entregue</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
