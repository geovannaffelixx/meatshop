import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dtos/create-expense.dto';
import { UpdateExpenseDto } from './dtos/update-expense.dto';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @ApiOperation({ summary: 'Retorna a receita diária de um mês (pedidos entregues)' })
  @ApiQuery({ name: 'month', description: 'Mês no formato YYYY-MM', example: '2026-08' })
  @ApiResponse({ status: 200, description: 'Receita mensal retornada com sucesso' })
  @Get('revenue')
  async revenue(@Query('month') month: string) {
    return this.service.monthlyRevenue(month);
  }

  @ApiOperation({ summary: 'Lista as despesas registradas em um mês' })
  @ApiQuery({ name: 'month', description: 'Mês no formato YYYY-MM', example: '2026-08' })
  @ApiResponse({ status: 200, description: 'Lista de despesas retornada com sucesso' })
  @Get('expenses')
  async expenses(@Query('month') month: string) {
    return this.service.listExpenses(month);
  }

  @ApiOperation({ summary: 'Registra uma nova despesa' })
  @ApiResponse({ status: 201, description: 'Despesa criada com sucesso' })
  @Post('expenses')
  async create(@Body() dto: CreateExpenseDto) {
    return this.service.createExpense(dto);
  }

  @ApiOperation({ summary: 'Atualiza uma despesa existente' })
  @ApiResponse({ status: 200, description: 'Despesa atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Despesa não encontrada' })
  @Put('expenses/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.service.updateExpense(id, dto);
  }

  @ApiOperation({ summary: 'Remove uma despesa' })
  @ApiResponse({ status: 200, description: 'Despesa removida com sucesso' })
  @Delete('expenses/:id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteExpense(id);
  }

  @ApiOperation({ summary: 'Retorna o resumo financeiro do mês (receitas, despesas e formas de pagamento)' })
  @ApiQuery({ name: 'month', description: 'Mês no formato YYYY-MM', example: '2026-08' })
  @ApiResponse({ status: 200, description: 'Resumo financeiro retornado com sucesso' })
  @Get('summary')
  async summary(@Query('month') month: string) {
    return this.service.summary(month);
  }
}
