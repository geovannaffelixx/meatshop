import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { AppLogger } from '../../common/logger/app.logger';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { CreateExpenseDto } from '../dtos/create-expense.dto';
import { Expense } from '../entities/expense.entity';

@Injectable()
export class CreateExpenseUseCase {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly logger: AppLogger,
  ) {}

  async execute(dto: CreateExpenseDto, currentUser: User): Promise<Expense> {
    const unit = await this.unitRepository.findOne({ where: { id: dto.unit_id } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    await this.unitAuthorizationService.assertHasPermission(
      currentUser, unit.id, UnitPermission.MANAGE_FINANCE,
    );

    const expense = this.expenseRepository.create({
      unit_id: dto.unit_id,
      supplierName: dto.supplierName,
      type: dto.type,
      amount: dto.amount,
      discount: dto.discount ?? 0,
      paidAmount: dto.paidAmount,
      postedAt: dto.postedAt ?? null,
      paidAt: dto.paidAt ?? null,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes ?? null,
      cpfCnpj: dto.cpfCnpj ?? null,
      supplierId: dto.supplierId ?? null,
    });

    const saved = await this.expenseRepository.save(expense);

    this.logger.info('Despesa criada', {
      id: saved.id,
      unitId: saved.unit_id,
      fornecedor: saved.supplierName,
      valor: saved.amount,
      tipo: saved.type,
      metodo: saved.paymentMethod,
    });

    return saved;
  }
}
