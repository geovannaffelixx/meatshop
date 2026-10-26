import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateUnitStatusDto } from '../dtos/update-unit-status.dto';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class UpdateUnitStatusUseCase {
  private readonly logger = new Logger(UpdateUnitStatusUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, dto: UpdateUnitStatusDto, currentUser: User): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    await this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    unit.is_active = dto.is_active;
    await this.unitRepository.save(unit);
    this.logger.log(
      `Unit ${unit.id} ${dto.is_active ? 'activated' : 'deactivated'} by user ${currentUser.id}`,
    );
    return unit;
  }
}
