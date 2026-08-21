import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { WEEKDAY_ORDER } from '../../units/enums/weekday.enum';

@Injectable()
export class BusinessHoursValidator {
  constructor(
    @InjectRepository(BusinessHours)
    private readonly businessHoursRepository: Repository<BusinessHours>,
  ) {}

  async assertWithinBusinessHours(unitId: number, date: Date): Promise<void> {
    const weekday = WEEKDAY_ORDER[date.getDay()];
    const hours = await this.businessHoursRepository.findOne({
      where: { unit_id: unitId, weekday },
    });

    // No hours configured for this unit/day yet — don't block scheduling.
    if (!hours) {
      return;
    }

    if (!hours.is_open) {
      throw new BadRequestException(`Unit is closed on ${weekday}`);
    }

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (time < hours.opening_time! || time > hours.closing_time!) {
      throw new BadRequestException(
        `Unit is only open between ${hours.opening_time} and ${hours.closing_time} on ${weekday}`,
      );
    }
  }
}
