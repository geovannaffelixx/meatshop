"use client"
import React, { useState, useEffect, ChangeEvent } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Spinner } from "@/shared/components/ui/spinner"
import { Plus } from "lucide-react"
import { FinanceSummary } from "./finance-summary"
import { apiGet, apiPost, apiPut, apiDelete } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type Expense = {
  id: string
  cpfCnpj: string
  idFornecedor: string
  fornecedor: string
  tipo: "Compras" | "Serviços" | "Outros"
  valor: number
  desconto: number
  valorPago: number
  dataLancamento?: string
  dataPagamento?: string
  observacoes?: string
  formaPagamento: "Pix" | "Crédito" | "Débito" | "Dinheiro" | "Boleto"
}

type Receita = { dia: number; valor: number }
type PaymentSlice = { name: string; value: number }

type ExpenseApi = {
  id: number
  cpfCnpj?: string
  supplierId?: string
  supplierName: string
  type: Expense["tipo"]
  amount: number | string
  discount: number | string
  paidAmount: number | string
  postedAt?: string
  paidAt?: string
  notes?: string
  paymentMethod: Expense["formaPagamento"]
}

type RevenueApi = { series: { day: number; value: number }[]; revenueTotal: number }
type SummaryApi = { revenueTotal: number; expensesTotal: number; payments: PaymentSlice[] }

const EMPTY_FORM = {
  id: "",
  idFornecedor: "",
  cpfCnpj: "",
  fornecedor: "",
  tipo: "Compras" as Expense["tipo"],
  valor: "",
  desconto: "",
  valorPago: "",
  dataLancamento: "",
  dataPagamento: "",
  observacoes: "",
  formaPagamento: "Pix" as Expense["formaPagamento"],
}

function parseCurrencyToNumber(formatted: string) {
  if (!formatted) return 0
  const digits = formatted.replace(/[^\d]/g, "")
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  return cents / 100
}
function parseCurrencyToNumberBR(formatted: string) {
  if (!formatted) return 0
  const raw = formatted.replace(/\s/g, "").replace("R$", "").trim()
  const normalized = raw.replace(/\./g, "").replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}
function roundMoney(value: number) {
  return Number((value || 0).toFixed(2))
}

function formatMoneyBR(value: number) {
  return roundMoney(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatCpfCnpj(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 14)
  if (digits.length <= 11) {
    const p1 = digits.slice(0, 3)
    const p2 = digits.slice(3, 6)
    const p3 = digits.slice(6, 9)
    const p4 = digits.slice(9, 11)
    let s = p1
    if (p2) s += "." + p2
    if (p3) s += "." + p3
    if (p4) s += "-" + p4
    return s
  } else {
    const p1 = digits.slice(0, 2)
    const p2 = digits.slice(2, 5)
    const p3 = digits.slice(5, 8)
    const p4 = digits.slice(8, 12)
    const p5 = digits.slice(12, 14)
    let s = p1
    if (p2) s += "." + p2
    if (p3) s += "." + p3
    if (p4) s += "/" + p4
    if (p5) s += "-" + p5
    return s
  }
}
function getMonthParam() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}
function formatDateBR(iso?: string) {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function mapExpenses(list: ExpenseApi[]): Expense[] {
  return list.map((e) => ({
    id: String(e.id),
    cpfCnpj: e.cpfCnpj ?? "",
    idFornecedor: e.supplierId ?? "",
    fornecedor: e.supplierName,
    tipo: e.type,
    valor: parseFloat(e.amount?.toString().replace(",", ".")) || 0,
    desconto: parseFloat(e.discount?.toString().replace(",", ".")) || 0,
    valorPago: parseFloat(e.paidAmount?.toString().replace(",", ".")) || 0,
    dataLancamento: e.postedAt ?? "",
    dataPagamento: e.paidAt ?? "",
    observacoes: e.notes ?? "",
    formaPagamento: e.paymentMethod,
  }))
}

export function FinanceScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(getMonthParam())

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [receitasTotal, setReceitasTotal] = useState(0)
  const [despesasTotal, setDespesasTotal] = useState(0)
  const [pagamentos, setPagamentos] = useState<PaymentSlice[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Expense | null>(null)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)

  const reloadExpensesAndSummary = async () => {
    if (!unitId) return
    const query = `month=${month}&unit_id=${unitId}`
    const [expensesApi, summary]: [ExpenseApi[], SummaryApi] = await Promise.all([
      apiGet(`/finance/expenses?${query}`),
      apiGet(`/finance/summary?${query}`),
    ])

    setExpenses(mapExpenses(expensesApi))
    setDespesasTotal(parseFloat(summary.expensesTotal?.toString().replace(",", ".")) || 0)
    setPagamentos(
      (summary.payments ?? []).map((p) => ({
        name: p.name === "Saldo MP" ? "Mercado Pago" : p.name,
        value: roundMoney(parseFloat(p.value?.toString().replace(",", ".")) || 0),
      })),
    )
  }

  useEffect(() => {
    if (!unitId) return

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const query = `month=${month}&unit_id=${unitId}`

        // 1) Receitas (revenue)
        const revenue: RevenueApi = await apiGet(`/finance/revenue?${query}`)

        const byDay = new Map<number, number>()
        revenue.series.forEach(s => byDay.set(s.day, s.value))

        const daysInMonth = new Date(
          Number(month.split("-")[0]),
          Number(month.split("-")[1]),
          0
        ).getDate()

        const receitasArr: Receita[] = Array.from({ length: daysInMonth }, (_, i) => ({
          dia: i + 1,
          valor: byDay.get(i + 1) ?? 0,
        }))
        setReceitas(receitasArr)
        setReceitasTotal(revenue.revenueTotal || 0)

        // 2) Despesas + resumo
        await reloadExpensesAndSummary()
      } catch (err) {
        console.error(err)
        setError("Falha ao carregar dados do Financeiro.")
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, unitId])

  // Cálcular o valor pago
  useEffect(() => {
    const valor = parseCurrencyToNumber(form.valor)
    const desconto = parseCurrencyToNumber(form.desconto)
    const valorPago = Math.max(valor - desconto, 0)
    if (valor || desconto) {
      setForm((p) => ({
        ...p,
        valorPago: valorPago
          ? valorPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "",
      }))
    }
  }, [form.valor, form.desconto])

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "cpfCnpj") return setForm((p) => ({ ...p, cpfCnpj: formatCpfCnpj(value) }))
    if (["valor", "desconto"].includes(name)) {
      const digits = value.replace(/\D/g, "").slice(0, 12)
      const number = digits ? parseInt(digits, 10) / 100 : 0
      const formatted = number
        ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : ""
      return setForm((p) => ({ ...p, [name]: formatted }))
    }
    if (name === "idFornecedor") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((p) => ({ ...p, idFornecedor: digits }))
    }
    setForm((p) => ({ ...p, [name]: value }))
  }

  const openCreateDialog = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEditDialog = (expense: Expense) => {
    setEditingId(expense.id)
    setForm({
      id: expense.id,
      idFornecedor: expense.idFornecedor,
      cpfCnpj: expense.cpfCnpj,
      fornecedor: expense.fornecedor,
      tipo: expense.tipo,
      valor: expense.valor ? formatMoneyBR(expense.valor) : "",
      desconto: expense.desconto ? formatMoneyBR(expense.desconto) : "",
      valorPago: expense.valorPago ? formatMoneyBR(expense.valorPago) : "",
      dataLancamento: expense.dataLancamento ?? "",
      dataPagamento: expense.dataPagamento ?? "",
      observacoes: expense.observacoes ?? "",
      formaPagamento: expense.formaPagamento,
    })
    setOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!form.fornecedor || !form.valor) {
      toast.warning("Preencha fornecedor e valor.")
      return
    }
    if (!unitId) {
      toast.warning("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)

    try {
      const valor = parseCurrencyToNumberBR(form.valor)
      const desconto = parseCurrencyToNumberBR(form.desconto)
      const valorPago = Math.max(valor - desconto, 0)

      const payload = {
        unit_id: unitId,
        supplierName: form.fornecedor,
        type: form.tipo,
        amount: Number(valor),
        discount: Number(desconto),
        paidAmount: Number(valorPago),
        postedAt: form.dataLancamento || null,
        paidAt: form.dataPagamento || null,
        paymentMethod: form.formaPagamento || "Pix",
        notes: form.observacoes || null,
        cpfCnpj: form.cpfCnpj || null,
        supplierId: form.idFornecedor || null,
      }

      if (editingId) {
        await apiPut(`/finance/expenses/${editingId}`, payload)
      } else {
        await apiPost("/finance/expenses", payload)
      }

      await reloadExpensesAndSummary()

      toast.success(editingId ? "Despesa atualizada com sucesso." : "Despesa registrada com sucesso.")
      setForm(EMPTY_FORM)
      setEditingId(null)
      setOpen(false)
    } catch (err) {
      console.error("Erro ao salvar despesa:", err)
    } finally {
      setSaving(false)
    }
  }

  const confirmRemoveExpense = async () => {
    if (!removing) return
    setConfirmingRemoval(true)
    try {
      await apiDelete(`/finance/expenses/${removing.id}`)
      await reloadExpensesAndSummary()
      toast.success("Despesa removida com sucesso.")
      setRemoving(null)
    } catch (err) {
      console.error("Erro ao remover despesa:", err)
    } finally {
      setConfirmingRemoval(false)
    }
  }

  // Gráfico de despesas por dia
  const despesasPorDiaMap = new Map<number, number>()
  expenses.forEach(e => {
    const rawDate = e.dataPagamento || e.dataLancamento
    if (rawDate) {
      const dia = Number(String(rawDate).slice(8, 10))
      const current = despesasPorDiaMap.get(dia) ?? 0
      despesasPorDiaMap.set(dia, current + e.valorPago)
    }
  })

  const daysInMonth = new Date(
    Number(month.split("-")[0]),
    Number(month.split("-")[1]),
    0
  ).getDate()

  const despesasPorDia: Receita[] = Array.from({ length: daysInMonth }, (_, i) => ({
    dia: i + 1,
    valor: despesasPorDiaMap.get(i + 1) ?? 0,
  }))

  const pieColors = ["#16a34a", "#ef4444", "#f59e0b", "#3b82f6", "#7c3aed"]

  return (
    <div className="min-h-screen w-full bg-[url('/BackgroundClaro.png')] bg-cover bg-center">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <h1 className="text-3xl font-bold text-center text-red-600 mb-6">Financeiro</h1>

          {/* Seletor de mês e unidade */}
          <div className="flex justify-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {units.length > 1 && (
              <select
                value={unitId ?? ""}
                onChange={(e) => setUnitId(Number(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!unitsLoading && units.length === 0 && (
            <div className="text-center text-red-600">
              Nenhuma unidade encontrada para este usuário.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RECEITAS */}
            <Card className="bg-white/70 backdrop-blur-md shadow-lg">
              <CardHeader className="px-4 pt-4 text-center">
                <CardTitle className="text-green-600">Receitas</CardTitle>
                <p className="text-sm text-gray-500">Total de vendas no mês</p>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center text-red-600">{error}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={receitas} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
                      <XAxis dataKey="dia" hide interval={0} tickCount={daysInMonth} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) =>
                          value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        }
                      />
                      <Bar dataKey="valor" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* DESPESAS + MODAL */}
            <Card className="bg-white/70 backdrop-blur-md shadow-lg relative">
              <CardHeader className="flex flex-col items-center px-4 pt-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-red-600">Despesas</CardTitle>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCreateDialog} className="bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center text-white shadow-md">
                        <Plus size={18} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-50 border border-gray-300 rounded-2xl shadow-2xl max-w-5xl">
                      <DialogHeader className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold text-red-700">
                          {editingId ? "Editar Despesa" : "Adicionar Despesa"}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="p-6 grid grid-cols-12 gap-4">
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-700">ID</label>
                          <Input value={form.id} disabled placeholder="Gerado automaticamente" />
                        </div>

                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-700">ID Fornecedor</label>
                          <Input name="idFornecedor" value={form.idFornecedor} onChange={handleFormChange} inputMode="numeric" />
                        </div>

                        <div className="col-span-4">
                          <label className="text-sm font-medium text-gray-700">CPF / CNPJ</label>
                          <Input name="cpfCnpj" value={form.cpfCnpj} onChange={handleFormChange} />
                        </div>

                        <div className="col-span-4">
                          <label className="text-sm font-medium text-gray-700">Fornecedor</label>
                          <Input name="fornecedor" value={form.fornecedor} onChange={handleFormChange} />
                        </div>

                        <div className="col-span-3 mt-3 flex flex-col justify-end">
                          <label className="text-sm font-medium text-gray-700 mb-1">Tipo</label>
                          <select
                            name="tipo"
                            value={form.tipo}
                            onChange={handleFormChange}
                            className="w-full border rounded-md px-3 py-2 text-gray-800"
                          >
                            <option>Compras</option>
                            <option>Serviços</option>
                            <option>Outros</option>
                          </select>
                        </div>

                        <div className="col-span-3 mt-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Valor</label>
                          <Input name="valor" value={form.valor} onChange={handleFormChange} inputMode="numeric" />
                        </div>

                        <div className="col-span-3 mt-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Desconto</label>
                          <Input name="desconto" value={form.desconto} onChange={handleFormChange} inputMode="numeric" />
                        </div>

                        <div className="col-span-3 mt-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Valor Pago (AUTO)</label>
                          <Input name="valorPago" value={form.valorPago} readOnly disabled />
                        </div>

                        <div className="col-span-12 mt-3 grid grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Data lançamento</label>
                            <Input type="date" name="dataLancamento" value={form.dataLancamento} onChange={handleFormChange} />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Data pagamento</label>
                            <Input type="date" name="dataPagamento" value={form.dataPagamento} onChange={handleFormChange} />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
                            <select
                              name="formaPagamento"
                              value={form.formaPagamento}
                              onChange={handleFormChange}
                              className="w-full border rounded-md px-3 py-1.5 text-gray-800"
                            >
                              <option>Pix</option>
                              <option>Crédito</option>
                              <option>Débito</option>
                              <option>Dinheiro</option>
                              <option>Boleto</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-span-12 mt-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Observações</label>
                          <Textarea name="observacoes" value={form.observacoes} onChange={handleFormChange} rows={3} />
                        </div>

                        <div className="col-span-12 mt-6 flex justify-end gap-3">
                          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                          <Button disabled={saving} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSaveExpense}>
                            {saving && <Spinner />}
                            {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
                          </Button>
                        </div>
                      </div>

                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">Total de despesas no mês</p>
              </CardHeader>

              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={despesasPorDia} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
                    <XAxis dataKey="dia" hide interval={0} tickCount={daysInMonth} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      }
                    />
                    <Bar dataKey="valor" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* LISTA DE DESPESAS */}
          <Card className="bg-white/70 backdrop-blur-md shadow-lg">
            <CardHeader className="px-4 pt-4">
              <CardTitle className="text-gray-700">Despesas do mês</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3">Fornecedor</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Valor pago</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Data</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center italic text-gray-500">Carregando despesas...</td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center italic text-gray-500">Nenhuma despesa registrada neste mês.</td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr key={expense.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{expense.fornecedor}</td>
                          <td className="p-3">{expense.tipo}</td>
                          <td className="p-3">{formatMoneyBR(expense.valorPago)}</td>
                          <td className="p-3">{expense.formaPagamento}</td>
                          <td className="p-3">{formatDateBR(expense.dataPagamento || expense.dataLancamento)}</td>
                          <td className="p-3 text-right space-x-3">
                            <button onClick={() => openEditDialog(expense)} className="font-semibold text-red-600 hover:underline">
                              Editar
                            </button>
                            <button onClick={() => setRemoving(expense)} className="font-semibold text-gray-600 hover:underline">
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FinanceSummary
              receitasTotal={receitasTotal}
              despesasTotal={despesasTotal}
              pagamentos={pagamentos}
            />

            <Card className="bg-white/70 backdrop-blur-md shadow-lg">
              <CardHeader className="px-4 pt-4 text-center">
                <CardTitle className="text-gray-700">Vendas por forma de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pagamentos}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ value }) => formatMoneyBR(Number(value ?? 0))}
                    >
                      {pagamentos.map((entry, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoneyBR(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {removing && (
          <div role="dialog" aria-modal="true" aria-labelledby="remove-expense-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 id="remove-expense-title" className="text-lg font-bold">Remover despesa?</h2>
              <p className="mt-2 text-gray-600">
                A despesa de <strong>{removing.fornecedor}</strong> no valor de {formatMoneyBR(removing.valorPago)} será removida permanentemente.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button disabled={confirmingRemoval} onClick={() => setRemoving(null)} className="rounded-md border px-4 py-2 disabled:opacity-50">
                  Cancelar
                </button>
                <button
                  disabled={confirmingRemoval}
                  onClick={() => void confirmRemoveExpense()}
                  className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {confirmingRemoval && <Spinner />}
                  {confirmingRemoval ? "Removendo..." : "Remover despesa"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
  )
}
