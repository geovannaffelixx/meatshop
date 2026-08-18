import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BusinessHoursDayDto } from '../dtos/business-hours-day.dto';
import { BusinessHoursResponseDto } from '../dtos/business-hours-response.dto';
import { SetBusinessHoursDto } from '../dtos/set-business-hours.dto';
import { BusinessHours } from '../entities/business-hours.entity';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';
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
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    dto.days.forEach((day) => this.assertValidTimeRange(day));
    await Promise.all(dto.days.map((day) => this.upsertDay(unitId, day)));

    const updated = await this.businessHoursRepository.find({ where: { unit_id: unitId } });
    return BusinessHoursResponseDto.fromEntities(sortByWeekday(updated));
  }

  private assertValidTimeRange(day: BusinessHoursDayDto): void {
    if (day.is_open && day.opening_time! >= day.closing_time!) {
      throw new BadRequestException(`opening_time must be before closing_time for ${day.weekday}`);
    }
  }

  private async upsertDay(unitId: number, day: BusinessHoursDayDto): Promise<void> {
    const existing = await this.businessHoursRepository.findOne({
      where: { unit_id: unitId, weekday: day.weekday },
    });

    const entity =
      existing ?? this.businessHoursRepository.create({ unit_id: unitId, weekday: day.weekday });

    entity.is_open = day.is_open;
    entity.opening_time = day.is_open ? day.opening_time! : null;
    entity.closing_time = day.is_open ? day.closing_time! : null;

    await this.businessHoursRepository.save(entity);
  }
}
