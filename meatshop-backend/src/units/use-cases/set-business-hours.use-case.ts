import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BusinessHoursResponseDto } from '../dtos/business-hours-response.dto';
import { SetBusinessHoursDto } from '../dtos/set-business-hours.dto';
import { BusinessHours } from '../entities/business-hours.entity';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';
import { assertSchedulingConfiguration } from '../utils/scheduling-configuration.util';
import { sortByWeekday } from '../utils/sort-by-weekday.util';

@Injectable()
export class SetBusinessHoursUseCase {
  constructor(
    @InjectRepository(BusinessHours)
    private readonly businessHoursRepository: Repository<BusinessHours>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(
    unitId: number,
    dto: SetBusinessHoursDto,
    currentUser: User,
  ): Promise<BusinessHoursResponseDto[]> {
    const weekdays = dto.days.map((day) => day.weekday);
    if (new Set(weekdays).size !== weekdays.length) {
      throw new BadRequestException('Each weekday must appear only once');
    }
    for (const day of dto.days) {
      if (
        day.is_open &&
        (!day.opening_time || !day.closing_time || day.opening_time >= day.closing_time)
      ) {
        throw new BadRequestException(
          `opening_time must be before closing_time for ${day.weekday}`,
        );
      }
    }
    return this.unitRepository.manager.transaction(async (manager) => {
      const units = manager.getRepository(Unit);
      const hours = manager.getRepository(BusinessHours);
      const unit = await units.findOne({
        where: { id: unitId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!unit) throw new NotFoundException('Unit not found');
      await this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);
      const slot =
        dto.scheduling_slot_minutes === undefined
          ? unit.scheduling_slot_minutes
          : dto.scheduling_slot_minutes;
      const capacity =
        dto.scheduling_capacity === undefined ? unit.scheduling_capacity : dto.scheduling_capacity;
      assertSchedulingConfiguration(slot, capacity);
      if (dto.scheduling_slot_minutes !== undefined || dto.scheduling_capacity !== undefined) {
        unit.scheduling_slot_minutes = slot;
        unit.scheduling_capacity = capacity;
        await units.save(unit);
      }
      await hours.upsert(
        dto.days.map((day) => ({
          unit_id: unitId,
          weekday: day.weekday,
          is_open: day.is_open,
          opening_time: day.is_open ? day.opening_time! : null,
          closing_time: day.is_open ? day.closing_time! : null,
        })),
        ['unit_id', 'weekday'],
      );
      const updated = await hours.find({ where: { unit_id: unitId } });
      return BusinessHoursResponseDto.fromEntities(sortByWeekday(updated));
    });
  }
}
