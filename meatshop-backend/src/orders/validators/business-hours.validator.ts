import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Weekday } from '../../units/enums/weekday.enum';

@Injectable()
export class BusinessHoursValidator {
  constructor(
    @InjectRepository(BusinessHours)
    private readonly businessHoursRepository: Repository<BusinessHours>,
  ) {}

  async assertWithinBusinessHours(unitId: number, date: Date): Promise<void> {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)!.value;
    const weekday = value('weekday').toUpperCase() as Weekday;
    const hours = await this.businessHoursRepository.findOne({
      where: { unit_id: unitId, weekday },
    });

    if (!hours) {
      return;
    }

    if (!hours.is_open) {
      throw new BadRequestException(`Unit is closed on ${weekday}`);
    }

    const time = `${value('hour')}:${value('minute')}`;
    if (time < hours.opening_time!.slice(0, 5) || time > hours.closing_time!.slice(0, 5)) {
      throw new BadRequestException(
        `Unit is only open between ${hours.opening_time} and ${hours.closing_time} on ${weekday}`,
      );
    }
  }
}
