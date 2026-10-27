import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Weekday } from '../../units/enums/weekday.enum';

const BUSINESS_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

@Injectable()
export class BusinessHoursValidator {
  constructor(
    @InjectRepository(BusinessHours)
    private readonly businessHoursRepository: Repository<BusinessHours>,
  ) {}

  async assertWithinBusinessHours(
    unitId: number,
    date: Date,
    manager?: EntityManager,
  ): Promise<void> {
    const parts = BUSINESS_TIME.formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)!.value;
    const weekday = value('weekday').toUpperCase() as Weekday;
    const repository = manager
      ? manager.getRepository(BusinessHours)
      : this.businessHoursRepository;
    const hours = await repository.findOne({
      where: { unit_id: unitId, weekday },
    });

    if (!hours) {
      return;
    }

    if (!hours.is_open) {
      throw new BadRequestException({
        code: 'UNIT_CLOSED',
        message: `Unit is closed on ${weekday}`,
      });
    }

    const time = `${value('hour')}:${value('minute')}`;
    if (time < hours.opening_time!.slice(0, 5) || time > hours.closing_time!.slice(0, 5)) {
      throw new BadRequestException({
        code: 'UNIT_CLOSED',
        message: `Unit is only open between ${hours.opening_time} and ${hours.closing_time} on ${weekday}`,
      });
    }
  }
}
