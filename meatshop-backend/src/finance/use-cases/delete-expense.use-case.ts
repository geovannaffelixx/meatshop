import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../../common/logger/app.logger';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Expense } from '../entities/expense.entity';

@Injectable()
export class DeleteExpenseUseCase {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly logger: AppLogger,
  ) {}

  async execute(id: number, currentUser: User): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const unit = await this.unitRepository.findOne({ where: { id: expense.unit_id } });
    if (unit) {
      this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);
    }

    await this.expenseRepository.remove(expense);
    this.logger.warn('Despesa removida', { id, unitId: expense.unit_id });
  }
}
