import { Controller, Get, Query, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('revenue')
  async revenue(@Query('month') month: string) {
    return this.service.monthlyRevenue(month);
  }

  @Get('expenses')
  async expenses(@Query('month') month: string) {
    return this.service.listExpenses(month);
  }

  @Post('expenses')
  async create(@Body() dto: CreateExpenseDto) {
    return this.service.createExpense(dto);
  }

  @Put('expenses/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.service.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteExpense(id);
  }

  @Get('summary')
  async summary(@Query('month') month: string) {
    return this.service.summary(month);
  }
}
