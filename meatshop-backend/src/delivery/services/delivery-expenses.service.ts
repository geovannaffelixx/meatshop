import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { businessDateKey } from '../../finance/utils/month-range.util';
import { DeliveryPersonAccessService } from './delivery-person-access.service';
import { ListDeliveryExpensesDto, SaveDeliveryExpenseDto } from '../dtos/delivery-expense.dto';

@Injectable()
export class DeliveryExpensesService {
  constructor(
    private readonly db: DataSource,
    private readonly access: DeliveryPersonAccessService,
  ) {}

  async list(user: User, filters: ListDeliveryExpensesDto) {
    await this.access.getOwnDeliveryPerson(user.id);
    const today = businessDateKey(new Date());
    const from = filters.from ?? `${today.slice(0, 7)}-01`;
    const to = filters.to ?? today;
    if (from > to) throw new BadRequestException('Invalid date range');
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const [summary] = await manager.query(
        'SELECT COUNT(*)::int AS total,COALESCE(SUM(amount),0)::text AS amount FROM delivery_expenses WHERE user_id=$1 AND incurred_on BETWEEN $2::date AND $3::date',
        [user.id, from, to],
      );
      const data = await manager.query(
        'SELECT * FROM delivery_expenses WHERE user_id=$1 AND incurred_on BETWEEN $2::date AND $3::date ORDER BY incurred_on DESC,id DESC LIMIT $4 OFFSET $5',
        [user.id, from, to, filters.limit, (filters.page - 1) * filters.limit],
      );
      return {
        data,
        total: summary.total,
        total_amount: summary.amount,
        page: filters.page,
        limit: filters.limit,
        from,
        to,
      };
    });
  }

  async save(user: User, dto: SaveDeliveryExpenseDto, id?: number) {
    await this.access.getOwnDeliveryPerson(user.id);
    if (dto.incurred_on > businessDateKey(new Date()) || !dto.description.trim())
      throw new BadRequestException('Invalid expense');
    const values = [user.id, dto.category, dto.description.trim(), dto.amount, dto.incurred_on];
    const result =
      id === undefined
        ? await this.db.query(
            'INSERT INTO delivery_expenses(user_id,category,description,amount,incurred_on) VALUES($1,$2,$3,$4,$5::date) RETURNING *',
            values,
          )
        : await this.db.query(
            'UPDATE delivery_expenses SET category=$2,description=$3,amount=$4,incurred_on=$5::date,updated_at=now() WHERE user_id=$1 AND id=$6 RETURNING *',
            [...values, id],
          );
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const expense = rows[0];
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async remove(user: User, id: number) {
    await this.access.getOwnDeliveryPerson(user.id);
    const rows = await this.db.query(
      'DELETE FROM delivery_expenses WHERE user_id=$1 AND id=$2 RETURNING id',
      [user.id, id],
    );
    const affected = Array.isArray(rows[0]) ? rows[0] : rows;
    if (!affected.length) throw new NotFoundException('Expense not found');
    return { deleted: true };
  }
}
