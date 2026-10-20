import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateUnitDto } from '../dtos/update-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';
import { UnitAddressService } from '../services/unit-address.service';
import { assertSchedulingConfiguration } from '../utils/scheduling-configuration.util';

@Injectable()
export class UpdateUnitUseCase {
  private readonly logger = new Logger(UpdateUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly unitAddressService: UnitAddressService,
  ) {}

  async execute(unitId: number, dto: UpdateUnitDto, currentUser: User): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    assertSchedulingConfiguration(
      dto.scheduling_slot_minutes === undefined
        ? unit.scheduling_slot_minutes
        : dto.scheduling_slot_minutes,
      dto.scheduling_capacity === undefined ? unit.scheduling_capacity : dto.scheduling_capacity,
    );

    const coordinates = await this.unitAddressService.coordinatesFor(dto, unit);
    Object.assign(unit, dto, coordinates);

    await this.unitRepository.save(unit);

    this.logger.log(`Unit ${unit.id} updated by user ${currentUser.id}`);

    return unit;
  }
}
