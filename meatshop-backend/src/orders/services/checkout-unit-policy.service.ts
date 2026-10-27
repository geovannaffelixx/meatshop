import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { BusinessHoursValidator } from '../validators/business-hours.validator';

@Injectable()
export class CheckoutUnitPolicyService {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly hours: BusinessHoursValidator,
  ) {}

  async assertAvailable(
    unitIds: number[],
    scheduled: boolean,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(Unit) : this.units;
    for (const id of [...new Set(unitIds)].sort((a, b) => a - b)) {
      const unit = await repository.findOneOrFail({
        where: { id },
        ...(manager ? { lock: { mode: 'pessimistic_read' as const } } : {}),
      });
      if (!unit.is_active)
        throw new BadRequestException({
          code: 'UNIT_INACTIVE',
          message: 'This unit is not accepting orders.',
        });
      if (!scheduled) await this.hours.assertWithinBusinessHours(id, new Date(), manager);
    }
  }
}
