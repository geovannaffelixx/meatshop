import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../../common/logger/app.logger';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateExpenseDto } from '../dtos/update-expense.dto';
import { Expense } from '../entities/expense.entity';

@Injectable()
export class UpdateExpenseUseCase {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly logger: AppLogger,
  ) {}

  async execute(id: number, dto: UpdateExpenseDto, currentUser: User): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const unit = await this.unitRepository.findOne({ where: { id: expense.unit_id } });
    if (unit) {
      this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);
    }

    Object.assign(expense, dto);
    const updated = await this.expenseRepository.save(expense);

    this.logger.warn('Despesa atualizada', {
      id,
      unitId: updated.unit_id,
      fornecedor: updated.supplierName,
      novoValor: updated.amount,
      metodo: updated.paymentMethod,
    });

    return updated;
  }
}
