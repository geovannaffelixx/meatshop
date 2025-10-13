import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, IsNull } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Order } from '../entities/order.entity';
import { AppLogger } from '../common/logger/app.logger';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenses: Repository<Expense>,

    @InjectRepository(Order)
    private readonly orders: Repository<Order>,

    private readonly logger: AppLogger,
  ) {}

  private normalizeMonthRange(month?: string) {
    if (!month)
      throw new BadRequestException('Query param "month" (YYYY-MM) is required.');
    if (!/^\d{4}-\d{2}$/.test(month))
      throw new BadRequestException('Invalid "month" format. Use YYYY-MM.');
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1)); // exclusive
    const daysInMonth = new Date(y, m, 0).getDate();
    return { start, end, y, m, daysInMonth };
  }

  private toNum(x: string | number | null | undefined): number {
    if (x == null) return 0;
    if (typeof x === 'number') return x;
    const normalized = x.replace(/\./g, '').replace(',', '.');
    const v = Number(normalized);
    return Number.isFinite(v) ? v : 0;
  }

  private n(x: any): number {
    return this.toNum(x);
  }

  // -------- DESPESAS --------

  async listExpenses(month: string) {
    const { y, m } = this.normalizeMonthRange(month);
    const mm = String(m).padStart(2, '0');
    const data = await this.expenses.find({
      where: [
        { paidAt: Like(`${y}-${mm}-%`) },
        { paidAt: IsNull(), postedAt: Like(`${y}-${mm}-%`) },
      ],
      order: { paidAt: 'DESC', id: 'DESC' },
    });
    this.logger.info('Listagem de despesas concluída', { month });
    return data;
  }

  async createExpense(dto: CreateExpenseDto) {
    const ent = this.expenses.create({
      supplierName: dto.supplierName,
      type: dto.type,
      amount: this.toNum(dto.amount),
      discount: this.toNum(dto.discount ?? 0),
      paidAmount: this.toNum(dto.paidAmount),
      postedAt: dto.postedAt ?? null,
      paidAt: dto.paidAt ?? null,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes ?? null,
      cpfCnpj: dto.cpfCnpj ?? null,
      supplierId: dto.supplierId ?? null,
    });

    const saved = await this.expenses.save(ent);

    // ✅ Loga a criação da despesa
    this.logger.info('Despesa criada', {
      id: saved.id,
      fornecedor: saved.supplierName,
      valor: saved.amount,
      tipo: saved.type,
      metodo: saved.paymentMethod,
    });

    return saved;
  }

  async updateExpense(id: number, dto: UpdateExpenseDto) {
    const patch: Partial<Expense> = {
      supplierName: dto.supplierName,
      type: dto.type,
      postedAt: dto.postedAt ?? null,
      paidAt: dto.paidAt ?? null,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes ?? null,
      cpfCnpj: dto.cpfCnpj ?? null,
      supplierId: dto.supplierId ?? null,
    };

    if (dto.amount !== undefined) patch.amount = this.toNum(dto.amount as any);
    if (dto.discount !== undefined) patch.discount = this.toNum(dto.discount as any);
    if (dto.paidAmount !== undefined) patch.paidAmount = this.toNum(dto.paidAmount as any);

    await this.expenses.update({ id }, patch);
    const updated = await this.expenses.findOne({ where: { id } });

    if (!updated) throw new BadRequestException('Expense not found.');

    // ✅ Loga atualização
    this.logger.warn('Despesa atualizada', {
      id,
      fornecedor: updated.supplierName,
      novoValor: updated.amount,
      metodo: updated.paymentMethod,
    });

    return updated;
  }

  async deleteExpense(id: number) {
    await this.expenses.delete({ id });
    // ✅ Loga exclusão
    this.logger.warn('Despesa removida', { id });
    return { ok: true };
  }

  // -------- RECEITAS --------

  async monthlyRevenue(month: string) {
    const { start, end, daysInMonth } = this.normalizeMonthRange(month);

    const rows = await this.orders
      .createQueryBuilder('o')
      .select(["strftime('%d', o.criadoEm) AS day", 'SUM(o.valor) AS total'])
      .where('o.status = :st', { st: 'Entregue' })
      .andWhere('o.criadoEm >= :start AND o.criadoEm < :end', { start, end })
      .groupBy("strftime('%d', o.criadoEm)")
      .getRawMany<{ day: string; total: string }>();

    const map = new Map<number, number>();
    for (const r of rows) {
      const d = Number(r.day);
      map.set(d, (map.get(d) ?? 0) + this.n(r.total));
    }

    const series = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      value: map.get(i + 1) ?? 0,
    }));

    const revenueTotal = series.reduce((s, r) => s + r.value, 0);

    // ✅ Loga cálculo de receita
    this.logger.info('Receita mensal calculada', { month, revenueTotal });

    return { series, revenueTotal };
  }

  // -------- RESUMO --------

  async summary(month: string) {
    const { y, m } = this.normalizeMonthRange(month);
    const mm = String(m).padStart(2, '0');

    const expenses = await this.expenses.find({
      where: [
        { paidAt: Like(`${y}-${mm}-%`) },
        { paidAt: IsNull(), postedAt: Like(`${y}-${mm}-%`) },
      ],
    });

    const expensesTotal = expenses.reduce((s, e) => s + this.n(e.paidAmount), 0);

    const paymentsMap = new Map<string, number>();
    for (const e of expenses) {
      const key = e.paymentMethod ?? 'Outros';
      paymentsMap.set(key, (paymentsMap.get(key) ?? 0) + this.n(e.paidAmount));
    }

    const payments = Array.from(paymentsMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    const { revenueTotal } = await this.monthlyRevenue(`${y}-${mm}`);

    // ✅ Loga geração do resumo
    this.logger.info('Resumo financeiro gerado', {
      month,
      revenueTotal,
      expensesTotal,
    });

    return { revenueTotal, expensesTotal, payments };
  }
}