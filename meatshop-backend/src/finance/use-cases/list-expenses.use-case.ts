import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { FinanceReportQueryDto } from '../dtos/finance-report-query.dto';
import { Expense } from '../entities/expense.entity';
import { normalizeMonthRange } from '../utils/month-range.util';

@Injectable()
export class ListExpensesUseCase {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: FinanceReportQueryDto, currentUser: User): Promise<Expense[]> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
      UnitPermission.VIEW_FINANCE,
    );
    const { year, month } = normalizeMonthRange(query.month);
    const mm = String(month).padStart(2, '0');

    return this.expenseRepository.find({
      where: [
        { unit_id: unitId, paidAt: Like(`${year}-${mm}-%`) },
        { unit_id: unitId, paidAt: IsNull(), postedAt: Like(`${year}-${mm}-%`) },
      ],
      order: { paidAt: 'DESC', id: 'DESC' },
    });
  }
}
