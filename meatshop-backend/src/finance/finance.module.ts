import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsModule } from '../units/units.module';
import { Expense } from './entities/expense.entity';
import { Sale } from './entities/sale.entity';
import { Order } from '../orders/entities/order.entity';
import { FinanceController } from './finance.controller';
import { SalesController } from './sales.controller';
import { CreateExpenseUseCase } from './use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from './use-cases/delete-expense.use-case';
import { GetFinanceSummaryUseCase } from './use-cases/get-finance-summary.use-case';
import { GetMonthlyRevenueUseCase } from './use-cases/get-monthly-revenue.use-case';
import { ListExpensesUseCase } from './use-cases/list-expenses.use-case';
import { UpdateExpenseUseCase } from './use-cases/update-expense.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, Order, Sale]), UnitsModule],
  controllers: [FinanceController, SalesController],
  providers: [
    GetMonthlyRevenueUseCase,
    GetFinanceSummaryUseCase,
    ListExpensesUseCase,
    CreateExpenseUseCase,
    UpdateExpenseUseCase,
    DeleteExpenseUseCase,
  ],
  exports: [TypeOrmModule, GetMonthlyRevenueUseCase],
})
export class FinanceModule {}
