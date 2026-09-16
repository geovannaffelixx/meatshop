import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateExpenseDto } from './dtos/create-expense.dto';
import { FinanceReportQueryDto } from './dtos/finance-report-query.dto';
import { UpdateExpenseDto } from './dtos/update-expense.dto';
import { CreateExpenseUseCase } from './use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from './use-cases/delete-expense.use-case';
import { GetFinanceSummaryUseCase } from './use-cases/get-finance-summary.use-case';
import { GetMonthlyRevenueUseCase } from './use-cases/get-monthly-revenue.use-case';
import { ListExpensesUseCase } from './use-cases/list-expenses.use-case';
import { UpdateExpenseUseCase } from './use-cases/update-expense.use-case';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly getMonthlyRevenueUseCase: GetMonthlyRevenueUseCase,
    private readonly getFinanceSummaryUseCase: GetFinanceSummaryUseCase,
    private readonly listExpensesUseCase: ListExpensesUseCase,
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly updateExpenseUseCase: UpdateExpenseUseCase,
    private readonly deleteExpenseUseCase: DeleteExpenseUseCase,
  ) {}

  @ApiOperation({
    summary: 'Returns daily revenue for a month from delivered orders for a unit',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly revenue returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('revenue')
  revenue(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.getMonthlyRevenueUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Returns a unit monthly financial summary with revenue, expenses, and payment methods',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial summary returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('summary')
  summary(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.getFinanceSummaryUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Lists expenses recorded for a unit in a month' })
  @ApiResponse({
    status: 200,
    description: 'Expense list returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('expenses')
  expenses(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.listExpensesUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Creates a new expense for a unit' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Post('expenses')
  create(@Body() dto: CreateExpenseDto, @CurrentUser() currentUser: User) {
    return this.createExpenseUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Updates an existing expense' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the expense unit',
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @Put('expenses/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateExpenseUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Deletes an expense' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the expense unit',
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @Delete('expenses/:id')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    await this.deleteExpenseUseCase.execute(id, currentUser);
    return { ok: true };
  }
}
