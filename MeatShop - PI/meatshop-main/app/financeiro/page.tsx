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
import { Plus, X } from "lucide-react"
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
  tipo: string
  valor: number
  desconto: number
  valorPago: number
  dataLancamento?: string
  dataPagamento?: string
  observacoes?: string
  formaPagamento: string
}

type Receita = {
  dia: number
  valor: number
}

function parseCurrencyToNumber(formatted: string) {
  if (!formatted) return 0
  const digits = formatted.replace(/[^\d]/g, "")
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  return cents / 100
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

// --- Funções Auxiliares para Mock ---
const FORNECEDORES = ["Frigorífico São João", "Fornecedor de Embalagens", "Distribuidora Água Azul", "Contabilidade ABC", "Eletro Manutenção"]
const TIPOS = ["Compras", "Serviços", "Outros"]
const FORMAS_PAGAMENTO = ["Pix", "Crédito", "Débito", "Dinheiro", "Boleto"]
const getCurrentMonthYear = () => {
  // Usamos um mês fixo (ex: Outubro) para que o mock seja estável
  return `2025-10` 
}

function generateMockExpenses(): Expense[] {
  const expenses: Expense[] = []
  const currentMonthYear = getCurrentMonthYear()
  const daysInMonth = 31

  // Gera 15 despesas fictícias espalhadas
  for (let i = 1; i <= 15; i++) { 
    const diaLancamento = Math.floor(Math.random() * daysInMonth) + 1
    const diaPagamento = Math.min(diaLancamento + Math.floor(Math.random() * 3), daysInMonth)
    
    const valor = Math.floor(100 + Math.random() * 3000)
    const desconto = Math.random() < 0.2 ? Math.floor(Math.random() * valor * 0.1) : 0
    const valorPago = Math.max(valor - desconto, 0)

    const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)]
    const fornecedor = FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)]
    const formaPagamento = FORMAS_PAGAMENTO[Math.floor(Math.random() * FORMAS_PAGAMENTO.length)]
    const cpfCnpj = Math.random() < 0.5 ? "12.345.678/0001-90" : "987.654.321-00" 

    expenses.push({
      id: String(Date.now() + i),
      cpfCnpj: cpfCnpj,
      fornecedor: fornecedor,
      tipo: tipo,
      valor: valor,
      desconto: desconto,
      valorPago: valorPago,
      dataLancamento: `${currentMonthYear}-${String(diaLancamento).padStart(2, '0')}`,
      dataPagamento: `${currentMonthYear}-${String(diaPagamento).padStart(2, '0')}`,
      observacoes: `Despesa gerada automaticamente ${i}`,
      formaPagamento: formaPagamento,
    })
  }

  // Adiciona as 3 despesas fixas originais
  expenses.push({
    id: "1",
    cpfCnpj: "12.345.678/0001-90",
    fornecedor: "Frigorífico São João",
    tipo: "Compras",
    valor: 1800,
    desconto: 0,
    valorPago: 1800,
    dataLancamento: "2025-10-01",
    dataPagamento: "2025-10-02",
    formaPagamento: "Pix",
    observacoes: "Lote semanal",
  },
  {
    id: "2",
    cpfCnpj: "987.654.321-00",
    fornecedor: "Fornecedor de embalagens",
    tipo: "Compras",
    valor: 620,
    desconto: 20,
    valorPago: 600,
    dataLancamento: "2025-10-03",
    dataPagamento: "2025-10-04",
    formaPagamento: "Crédito",
    observacoes: "Bobinas e caixas",
  },
  {
    id: "3",
    cpfCnpj: "55.444.333/0001-22",
    fornecedor: "Distribuidora Água Azul",
    tipo: "Serviços",
    valor: 300,
    desconto: 0,
    valorPago: 300,
    dataLancamento: "2025-10-05",
    dataPagamento: "2025-10-05",
    formaPagamento: "Dinheiro",
    observacoes: "Fornecimento de gelo",
  })
  
  return expenses.sort((a, b) => new Date(b.dataPagamento ?? "").getTime() - new Date(a.dataPagamento ?? "").getTime())
}

export default function FinanceiroPage() {
  const [open, setOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [receitasTotal, setReceitasTotal] = useState(0)
  
  // ===============================================
  // 1. ATUALIZAÇÃO: ADICIONANDO 'idFornecedor'
  // ===============================================
  const [form, setForm] = useState({
    id: "", // ID Despesa
    idFornecedor: "", // NOVO CAMPO: ID Fornecedor
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

  // --- MOCK DE DADOS FIXOS/FICTÍCIOS ---
  useEffect(() => {
    // Mock de Receitas (Garante 31 dias)
    const receitasFicticias: Receita[] = Array.from({ length: 31 }, (_, i) => ({
      dia: i + 1,
      valor: Math.floor(3000 + Math.random() * 1500),
    }))
    setReceitas(receitasFicticias)
    setReceitasTotal(receitasFicticias.reduce((s, r) => s + r.valor, 0))

    // Mock de Despesas
    const despesasFicticias: Expense[] = generateMockExpenses()
    setExpenses(despesasFicticias)
  }, [])

  // --- AUTO CÁLCULO DE VALOR PAGO ---
  useEffect(() => {
    const valor = parseCurrencyToNumber(form.valor)
    const desconto = parseCurrencyToNumber(form.desconto)
    const valorPago = Math.max(valor - desconto, 0)
    if (valor || desconto) {
      setForm((p) => ({
        ...p,
        valorPago: valorPago
          ? valorPago.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "",
      }))
    }
  }, [form.valor, form.desconto])

  // --- RESUMOS ---
  const despesasTotal = expenses.reduce((s, e) => s + e.valorPago, 0) 
  const pagamentos = (() => {
    const map = new Map<string, number>()
    expenses.forEach((e) => {
      map.set(e.formaPagamento, (map.get(e.formaPagamento) ?? 0) + e.valorPago)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  })()

  // --- FORM HANDLERS ---
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
    
    // ===============================================
    // 2. ATUALIZAÇÃO: LÓGICA PARA 'id' e 'idFornecedor'
    // ===============================================
    if (name === "id") { // ID Despesa
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((p) => ({ ...p, id: digits }))
    }
    if (name === "idFornecedor") { // NOVO CAMPO: ID Fornecedor
      const digits = value.replace(/\D/g, "").slice(0, 10)
      return setForm((p) => ({ ...p, idFornecedor: digits }))
    }
    // ===============================================
    
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleAddExpense = () => {
    if (!form.fornecedor || !form.valor) return alert("Preencha fornecedor e valor.")
    const valor = parseCurrencyToNumber(form.valor)
    const desconto = parseCurrencyToNumber(form.desconto)
    const valorPago = Math.max(valor - desconto, 0)
    const newExp: Expense = {
      id: form.id || String(Date.now()),
      cpfCnpj: form.cpfCnpj,
      fornecedor: form.fornecedor,
      tipo: form.tipo,
      valor,
      desconto,
      valorPago,
      dataLancamento: form.dataLancamento,
      dataPagamento: form.dataPagamento,
      observacoes: form.observacoes + (form.idFornecedor ? ` | ID Fornecedor: ${form.idFornecedor}` : ''), // Adiciona idFornecedor nas observações, pois não existe na Expense type
      formaPagamento: form.formaPagamento || "Pix",
    }
    setExpenses((prev) => [newExp, ...prev])
    setForm({
      id: "",
      idFornecedor: "", // Resetar o novo campo
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
  }

  // --- GRÁFICOS (Garante 31 barras alinhadas) ---
  const pieColors = ["#16a34a", "#ef4444", "#f59e0b", "#3b82f6", "#7c3aed"]
  
  // Mapeamento das despesas por dia
  const despesasPorDiaMap = new Map<number, number>()
  expenses.forEach(e => {
    if (e.dataPagamento) {
      // Pega o dia do mês (1 a 31)
      const dia = new Date(e.dataPagamento).getDate()
      const current = despesasPorDiaMap.get(dia) ?? 0
      despesasPorDiaMap.set(dia, current + e.valorPago)
    }
  })

  // Cria o array de dados com EXATAMENTE 31 dias, preenchendo com o valor ou 0
  const despesasPorDia: Receita[] = Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    valor: despesasPorDiaMap.get(i + 1) ?? 0,
  }))

  return (
    <PadraoPage titulo="Financeiro" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-[url('/BackgroundClaro.png')] bg-cover bg-center">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <h1 className="text-3xl font-bold text-center text-red-600 mb-6">Financeiro</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RECEITAS */}
            <Card className="bg-white/70 backdrop-blur-md shadow-lg">
              <CardHeader className="px-4 pt-4 text-center">
                <CardTitle className="text-green-600">Receitas</CardTitle>
                <p className="text-sm text-gray-500">Total de vendas no mês</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={receitas} 
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    barCategoryGap="1%" // Adicionado para forçar o espaçamento consistente
                  >
                    <XAxis dataKey="dia" hide interval={0} tickCount={31} /> 
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* DESPESAS + MODAL */}
            <Card className="bg-white/70 backdrop-blur-md shadow-lg relative">
              <CardHeader className="flex flex-col items-center px-4 pt-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-red-600">Despesas</CardTitle>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center text-white shadow-md">
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
                        {/* =============================================== */}
                        {/* 3. ATUALIZAÇÃO: ESTRUTURA DOS CAMPOS DE ID/CPF/CNPJ/FORNECEDOR */}
                        {/* Ajustado de col-span-2, col-span-4, col-span-6 para 4 campos */}
                        {/* =============================================== */}
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
                        {/* =============================================== */}

                        {/* Linha de tipo, valor, desconto e valor pago */}
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

                        {/* Linha única para datas e forma de pagamento */}
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
                          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAddExpense}>Salvar</Button>
                        </div>
                      </div>

                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">Total de despesas no mês</p>
              </CardHeader>

              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={despesasPorDia} 
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    barCategoryGap="1%" // Adicionado para forçar o espaçamento consistente
                  >
                    <XAxis dataKey="dia" hide interval={0} tickCount={31} /> 
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Resultados receitasTotal={receitasTotal} despesasTotal={despesasTotal} pagamentos={pagamentos} />

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

          <div className="text-center text-gray-600 text-sm mt-6">
            MeatShop © 2025 — Todos os direitos reservados
          </div>
        </div>
      </div>
    </PadraoPage>
  )
}