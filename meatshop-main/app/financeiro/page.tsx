"use client"
import React, { useState, useEffect, ChangeEvent } from "react"
import PadraoPage from "@/components/layoutPadrao"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import Resultados from "@/components/resultados"
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

type RevenueApi = { series: { day: number; value: number }[]; revenueTotal: number }
type SummaryApi = { revenueTotal: number; expensesTotal: number; payments: PaymentSlice[] }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

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
function toDecimalStringBR(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
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

export default function FinanceiroPage() {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(getMonthParam())

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [receitasTotal, setReceitasTotal] = useState(0)
  const [despesasTotal, setDespesasTotal] = useState(0)
  const [pagamentos, setPagamentos] = useState<PaymentSlice[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
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
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Receitas (revenue)
        const r1 = await fetch(`${API_URL}/finance/revenue?month=${month}`)
        const revenue: RevenueApi = await r1.json()

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

        // 2) Despesas (expenses)
        const r2 = await fetch(`${API_URL}/finance/expenses?month=${month}`)
        const expensesApi = await r2.json()
        const mapped: Expense[] = (expensesApi as any[]).map((e) => ({
          id: String(e.id),
          cpfCnpj: e.cpfCnpj ?? "",
          fornecedor: e.supplierName,
          tipo: e.type,
          valor: Number(e.amount),
          desconto: Number(e.discount ?? 0),
          valorPago: Number(e.paidAmount),
          dataLancamento: e.postedAt ?? "",
          dataPagamento: e.paidAt ?? "",
          observacoes: e.notes ?? "",
          formaPagamento: e.paymentMethod,
        }))
        setExpenses(mapped)

        // 3) Resumo (summary)
        const r3 = await fetch(`${API_URL}/finance/summary?month=${month}`)
        const summary: SummaryApi = await r3.json()
        setDespesasTotal(summary.expensesTotal ?? 0)
        setPagamentos(summary.payments ?? [])
      } catch (err) {
        console.error(err)
        setError("Falha ao carregar dados do Financeiro.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month])

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
    if (name === "id") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((p) => ({ ...p, id: digits }))
    }
    if (name === "idFornecedor") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((p) => ({ ...p, idFornecedor: digits }))
    }
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleAddExpense = async () => {
    if (!form.fornecedor || !form.valor) return alert("Preencha fornecedor e valor.")
    try {
      setLoading(true)
      setError(null)

      const valor = parseCurrencyToNumberBR(form.valor as any)
      const desconto = parseCurrencyToNumberBR(form.desconto as any)
      const valorPago = Math.max(valor - desconto, 0)

      const payload = {
        supplierName: form.fornecedor,
        type: form.tipo,
        amount: toDecimalStringBR(valor),
        discount: toDecimalStringBR(desconto),
        paidAmount: toDecimalStringBR(valorPago),
        postedAt: form.dataLancamento || null,
        paidAt: form.dataPagamento || null,
        paymentMethod: form.formaPagamento || "Pix",
        notes: (form.observacoes || "") + (form.idFornecedor ? ` | SupplierID: ${form.idFornecedor}` : ""),
        cpfCnpj: form.cpfCnpj || null,
        supplierId: form.idFornecedor || null,
      }

      const res = await fetch(`${API_URL}/finance/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Erro ao salvar despesa")
      }

      // Recarrega lista e resumo
      const [rExp, rSum] = await Promise.all([
        fetch(`${API_URL}/finance/expenses?month=${month}`),
        fetch(`${API_URL}/finance/summary?month=${month}`),
      ])

      const expensesApi = await rExp.json()
      const mapped: Expense[] = (expensesApi as any[]).map((e) => ({
        id: String(e.id),
        cpfCnpj: e.cpfCnpj ?? "",
        fornecedor: e.supplierName,
        tipo: e.type,
        valor: Number(e.amount),
        desconto: Number(e.discount ?? 0),
        valorPago: Number(e.paidAmount),
        dataLancamento: e.postedAt ?? "",
        dataPagamento: e.paidAt ?? "",
        observacoes: e.notes ?? "",
        formaPagamento: e.paymentMethod,
      }))
      setExpenses(mapped)

      const summary: SummaryApi = await rSum.json()
      setDespesasTotal(summary.expensesTotal ?? 0)
      setPagamentos(summary.payments ?? [])

      // Limpa form e fecha modal
      setForm({
        id: "",
        idFornecedor: "",
        cpfCnpj: "",
        fornecedor: "",
        tipo: "Compras",
        valor: "",
        desconto: "",
        valorPago: "",
        dataLancamento: "",
        dataPagamento: "",
        observacoes: "",
        formaPagamento: "Pix",
      })
      setOpen(false)
    } catch (err) {
      console.error(err)
      alert("Erro ao salvar despesa. Verifique os campos e tente novamente.")
    } finally {
      setLoading(false)
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
    <PadraoPage titulo="Financeiro" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-[url('/BackgroundClaro.png')] bg-cover bg-center">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <h1 className="text-3xl font-bold text-center text-red-600 mb-6">Financeiro</h1>

          {/* Seletor de mês */}
          <div className="flex justify-center">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

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
                      <Tooltip />
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
                      <Button disabled={loading} className="bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center text-white shadow-md">
                        <Plus size={18} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-50 border border-gray-300 rounded-2xl shadow-2xl max-w-5xl">
                      <DialogHeader className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold text-red-700">
                          Adicionar Despesa
                        </DialogTitle>
                      </DialogHeader>

                      <div className="p-6 grid grid-cols-12 gap-4">
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-700">ID</label>
                          <Input name="id" value={form.id} onChange={handleFormChange} inputMode="numeric" />
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
                          <Button disabled={loading} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAddExpense}>
                            {loading ? "Salvando..." : "Salvar"}
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
                    <Tooltip />
                    <Bar dataKey="valor" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Resultados
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
                    <Pie data={pagamentos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pagamentos.map((entry, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PadraoPage>
  )
}