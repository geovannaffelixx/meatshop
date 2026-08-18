import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessHoursResponseDto } from '../dtos/business-hours-response.dto';
import { BusinessHours } from '../entities/business-hours.entity';
import { Unit } from '../entities/unit.entity';
import { sortByWeekday } from '../utils/sort-by-weekday.util';

@Injectable()
export class ListBusinessHoursUseCase {
  constructor(
    @InjectRepository(BusinessHours)
    private readonly businessHoursRepository: Repository<BusinessHours>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async execute(unitId: number): Promise<BusinessHoursResponseDto[]> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hours = await this.businessHoursRepository.find({ where: { unit_id: unitId } });
    return BusinessHoursResponseDto.fromEntities(sortByWeekday(hours));
  }
}
