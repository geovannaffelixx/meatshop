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
    summary: 'Retorna a receita diária de um mês (pedidos entregues) de uma unidade',
  })
  @ApiResponse({ status: 200, description: 'Receita mensal retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('revenue')
  revenue(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.getMonthlyRevenueUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary:
      'Retorna o resumo financeiro do mês (receitas, despesas e formas de pagamento) de uma unidade',
  })
  @ApiResponse({ status: 200, description: 'Resumo financeiro retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('summary')
  summary(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.getFinanceSummaryUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Lista as despesas registradas em um mês para uma unidade' })
  @ApiResponse({ status: 200, description: 'Lista de despesas retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('expenses')
  expenses(@Query() query: FinanceReportQueryDto, @CurrentUser() currentUser: User) {
    return this.listExpensesUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Registra uma nova despesa para uma unidade' })
  @ApiResponse({ status: 201, description: 'Despesa criada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @Post('expenses')
  create(@Body() dto: CreateExpenseDto, @CurrentUser() currentUser: User) {
    return this.createExpenseUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza uma despesa existente' })
  @ApiResponse({ status: 200, description: 'Despesa atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade da despesa' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @Put('expenses/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateExpenseUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Remove uma despesa' })
  @ApiResponse({ status: 200, description: 'Despesa removida com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade da despesa' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @Delete('expenses/:id')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    await this.deleteExpenseUseCase.execute(id, currentUser);
    return { ok: true };
  }
}
