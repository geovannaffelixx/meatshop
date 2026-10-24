import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SaveDeliveryExpenseDto, ListDeliveryExpensesDto } from './dtos/delivery-expense.dto';
import { DeliveryExpensesService } from './services/delivery-expenses.service';

@Controller('delivery/expenses')
export class DeliveryExpensesController {
  constructor(private readonly expenses: DeliveryExpensesService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListDeliveryExpensesDto) {
    return this.expenses.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: SaveDeliveryExpenseDto) {
    return this.expenses.save(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveDeliveryExpenseDto,
  ) {
    return this.expenses.save(user, dto, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.remove(user, id);
  }
}
