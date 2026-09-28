"use client"
import React, { useState, useEffect, ChangeEvent } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { RequiredMark } from "@/shared/components/ui/required-mark"
import { Spinner } from "@/shared/components/ui/spinner"
import { Plus } from "lucide-react"
import { PaymentManagement } from "./payment-management"
import { FinanceSummary } from "./finance-summary"
import { apiGet, apiPost, apiPut, apiDelete } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { PageHeader } from "@/shared/components/page-header"
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
  supplierId: string
  supplierName: string
  type: "Purchases" | "Services" | "Other"
  amount: number
  discount: number
  paidAmount: number
  postedAt?: string
  paidAt?: string
  notes?: string
  paymentMethod: "Pix" | "Credit" | "Debit" | "Cash" | "Bank Slip"
}

type RevenuePoint = { day: number; value: number }
type PaymentSlice = { name: string; value: number }

type ExpenseApi = {
  id: number
  cpfCnpj?: string
  supplierId?: string
  supplierName: string
  type: Expense["type"]
  amount: number | string
  discount: number | string
  paidAmount: number | string
  postedAt?: string
  paidAt?: string
  notes?: string
  paymentMethod: Expense["paymentMethod"]
}

type RevenueApi = { series: { day: number; value: number }[]; revenueTotal: number }
type SummaryApi = { revenueTotal: number; expensesTotal: number; payments: PaymentSlice[] }

const EMPTY_FORM = {
  id: "",
  supplierId: "",
  cpfCnpj: "",
  supplierName: "",
  type: "Purchases" as Expense["type"],
  amount: "",
  discount: "",
  paidAmount: "",
  postedAt: "",
  paidAt: "",
  notes: "",
  paymentMethod: "Pix" as Expense["paymentMethod"],
}

function parseCurrencyToNumber(formatted: string) {
  if (!formatted) return 0
  const digits = formatted.replace(/[^\d]/g, "")
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  return cents / 100
}
function parseLocalizedCurrency(formatted: string) {
  if (!formatted) return 0
  const raw = formatted.replace(/\s/g, "").replace("R$", "").trim()
  const normalized = raw.replace(/\./g, "").replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}
function roundMoney(value: number) {
  return Number((value || 0).toFixed(2))
}

function formatCurrency(value: number) {
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
function formatLocalDate(iso?: string) {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function mapExpenses(list: ExpenseApi[]): Expense[] {
  return list.map((e) => ({
    id: String(e.id),
    cpfCnpj: e.cpfCnpj ?? "",
    supplierId: e.supplierId ?? "",
    supplierName: e.supplierName,
    type: e.type,
    amount: parseFloat(e.amount?.toString().replace(",", ".")) || 0,
    discount: parseFloat(e.discount?.toString().replace(",", ".")) || 0,
    paidAmount: parseFloat(e.paidAmount?.toString().replace(",", ".")) || 0,
    postedAt: e.postedAt ?? "",
    paidAt: e.paidAt ?? "",
    notes: e.notes ?? "",
    paymentMethod: e.paymentMethod,
  }))
}

export function FinanceScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(getMonthParam())

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([])
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [payments, setPayments] = useState<PaymentSlice[]>([])

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
    setExpenseTotal(parseFloat(summary.expensesTotal?.toString().replace(",", ".")) || 0)
    setPayments(
      (summary.payments ?? []).map((p) => ({
        name: p.name === "Mercado Pago Balance" ? "Mercado Pago" : p.name,
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

        const revenue: RevenueApi = await apiGet(`/finance/revenue?${query}`)

        const byDay = new Map<number, number>()
        revenue.series.forEach(s => byDay.set(s.day, s.value))

        const daysInMonth = new Date(
          Number(month.split("-")[0]),
          Number(month.split("-")[1]),
          0
        ).getDate()

        const series: RevenuePoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
          day: i + 1,
          value: byDay.get(i + 1) ?? 0,
        }))
        setRevenueSeries(series)
        setRevenueTotal(revenue.revenueTotal || 0)

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

  useEffect(() => {
    const amount = parseCurrencyToNumber(form.amount)
    const discount = parseCurrencyToNumber(form.discount)
    const paidAmount = Math.max(amount - discount, 0)
    if (amount || discount) {
      setForm((current) => ({
        ...current,
        paidAmount: paidAmount
          ? paidAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "",
      }))
    }
  }, [form.amount, form.discount])

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "cpfCnpj") return setForm((p) => ({ ...p, cpfCnpj: formatCpfCnpj(value) }))
    if (["amount", "discount"].includes(name)) {
      const digits = value.replace(/\D/g, "").slice(0, 12)
      const number = digits ? parseInt(digits, 10) / 100 : 0
      const formatted = number
        ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : ""
      return setForm((current) => ({ ...current, [name]: formatted }))
    }
    if (name === "supplierId") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((current) => ({ ...current, supplierId: digits }))
    }
    setForm((current) => ({ ...current, [name]: value }))
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
      supplierId: expense.supplierId,
      cpfCnpj: expense.cpfCnpj,
      supplierName: expense.supplierName,
      type: expense.type,
      amount: expense.amount ? formatCurrency(expense.amount) : "",
      discount: expense.discount ? formatCurrency(expense.discount) : "",
      paidAmount: expense.paidAmount ? formatCurrency(expense.paidAmount) : "",
      postedAt: expense.postedAt ?? "",
      paidAt: expense.paidAt ?? "",
      notes: expense.notes ?? "",
      paymentMethod: expense.paymentMethod,
    })
    setOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!form.supplierName || !form.amount) {
      toast.warning("Preencha fornecedor e valor.")
      return
    }
    if (!unitId) {
      toast.warning("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)

    try {
      const amount = parseLocalizedCurrency(form.amount)
      const discount = parseLocalizedCurrency(form.discount)
      const paidAmount = Math.max(amount - discount, 0)

      const payload = {
        unit_id: unitId,
        supplierName: form.supplierName,
        type: form.type,
        amount: Number(amount),
        discount: Number(discount),
        paidAmount: Number(paidAmount),
        postedAt: form.postedAt || null,
        paidAt: form.paidAt || null,
        paymentMethod: form.paymentMethod || "Pix",
        notes: form.notes || null,
        cpfCnpj: form.cpfCnpj || null,
        supplierId: form.supplierId || null,
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
      console.error("Failed to save expense:", err)
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
      console.error("Failed to remove expense:", err)
    } finally {
      setConfirmingRemoval(false)
    }
  }

  const expensesByDayMap = new Map<number, number>()
  expenses.forEach((expense) => {
    const rawDate = expense.paidAt || expense.postedAt
    if (rawDate) {
      const day = Number(String(rawDate).slice(8, 10))
      const current = expensesByDayMap.get(day) ?? 0
      expensesByDayMap.set(day, current + expense.paidAmount)
    }
  })

  const daysInMonth = new Date(
    Number(month.split("-")[0]),
    Number(month.split("-")[1]),
    0
  ).getDate()

  const expensesByDay: RevenuePoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    value: expensesByDayMap.get(i + 1) ?? 0,
  }))

  const pieColors = ["#16a34a", "#ef4444", "#f59e0b", "#3b82f6", "#7c3aed"]

  return (
    <div className="page-surface">
        <div className="page-container max-w-7xl">
          <PageHeader
            eyebrow="Gestão"
            title="Financeiro"
            description="Acompanhe receitas, despesas, saldo e formas de pagamento."
          />

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium text-slate-700">
              Competência
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input mt-1"
            />
            </label>
            {units.length > 1 && (
              <label className="text-sm font-medium text-slate-700">
                Unidade
              <select
                value={unitId ?? ""}
                onChange={(e) => setUnitId(Number(e.target.value))}
                className="input mt-1"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              </label>
            )}
          </div>

          {unitId && <PaymentManagement key={unitId} unitId={unitId} />}

          {!unitsLoading && units.length === 0 && (
            <div className="text-center text-red-600">
              Nenhuma unidade encontrada para este usuário.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <BarChart data={revenueSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
                      <XAxis dataKey="day" hide interval={0} tickCount={daysInMonth} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) =>
                          value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        }
                      />
                      <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

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
                    <DialogContent className="max-w-4xl">
                      <DialogHeader className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold text-red-700">
                          {editingId ? "Editar Despesa" : "Adicionar Despesa"}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">ID</label>
                          <Input value={form.id} disabled placeholder="Gerado automaticamente" />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-sm font-medium text-gray-700">ID Fornecedor</label>
                          <Input name="supplierId" value={form.supplierId} onChange={handleFormChange} inputMode="numeric" placeholder="Ex.: 1024" />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-sm font-medium text-gray-700">CPF / CNPJ</label>
                          <Input name="cpfCnpj" value={form.cpfCnpj} onChange={handleFormChange} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
                        </div>

                        <div className="md:col-span-4">
                          <label className="text-sm font-medium text-gray-700">Fornecedor<RequiredMark /></label>
                          <Input name="supplierName" value={form.supplierName} onChange={handleFormChange} placeholder="Ex.: Distribuidora Central" required />
                        </div>

                        <div className="flex flex-col justify-end md:col-span-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Tipo<RequiredMark /></label>
                          <select
                            name="type"
                            value={form.type}
                            onChange={handleFormChange}
                            className="w-full border rounded-md px-3 py-2 text-gray-800"
                            required
                          >
                            <option value="Purchases">Compras</option>
                            <option value="Services">Serviços</option>
                            <option value="Other">Outros</option>
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Valor<RequiredMark /></label>
                          <Input name="amount" value={form.amount} onChange={handleFormChange} inputMode="numeric" placeholder="Ex.: R$ 1.250,00" required />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Desconto</label>
                          <Input name="discount" value={form.discount} onChange={handleFormChange} inputMode="numeric" placeholder="Ex.: R$ 50,00" />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-sm font-medium text-gray-700 mb-1">Valor Pago (AUTO)</label>
                          <Input name="paidAmount" value={form.paidAmount} readOnly disabled />
                        </div>

                        <div className="grid items-end gap-4 md:col-span-12 sm:grid-cols-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Data lançamento</label>
                            <Input type="date" name="postedAt" value={form.postedAt} onChange={handleFormChange} />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Data pagamento</label>
                            <Input type="date" name="paidAt" value={form.paidAt} onChange={handleFormChange} />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
                            <select
                              name="paymentMethod"
                              value={form.paymentMethod}
                              onChange={handleFormChange}
                              className="w-full border rounded-md px-3 py-1.5 text-gray-800"
                            >
                              <option>Pix</option>
                              <option value="Credit">Crédito</option>
                              <option value="Debit">Débito</option>
                              <option value="Cash">Dinheiro</option>
                              <option value="Bank Slip">Boleto</option>
                            </select>
                          </div>
                        </div>

                        <div className="md:col-span-12">
                          <label className="text-sm font-medium text-gray-700 mb-1">Observações</label>
                          <Textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3} placeholder="Ex.: Pagamento referente ao pedido mensal." />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end md:col-span-12">
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
                  <BarChart data={expensesByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
                    <XAxis dataKey="day" hide interval={0} tickCount={daysInMonth} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      }
                    />
                    <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
                          <td className="p-3 font-medium">{expense.supplierName}</td>
                          <td className="p-3">{expense.type}</td>
                          <td className="p-3">{formatCurrency(expense.paidAmount)}</td>
                          <td className="p-3">{expense.paymentMethod}</td>
                          <td className="p-3">{formatLocalDate(expense.paidAt || expense.postedAt)}</td>
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
              revenueTotal={revenueTotal}
              expenseTotal={expenseTotal}
              payments={payments}
            />

            <Card className="bg-white/70 backdrop-blur-md shadow-lg">
              <CardHeader className="px-4 pt-4 text-center">
                <CardTitle className="text-gray-700">Vendas por forma de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={payments}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ value }) => formatCurrency(Number(value ?? 0))}
                    >
                      {payments.map((entry, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={Boolean(removing)} onOpenChange={(nextOpen) => !nextOpen && setRemoving(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remover despesa?</DialogTitle>
              <DialogDescription>
                A despesa de {removing?.supplierName} no valor de {removing ? formatCurrency(removing.paidAmount) : ""} será removida permanentemente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" disabled={confirmingRemoval} onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" disabled={confirmingRemoval} onClick={() => void confirmRemoveExpense()}>
                {confirmingRemoval && <Spinner />}
                {confirmingRemoval ? "Removendo..." : "Remover despesa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
