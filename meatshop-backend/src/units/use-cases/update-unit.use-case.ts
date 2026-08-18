import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateUnitDto } from '../dtos/update-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class UpdateUnitUseCase {
  private readonly logger = new Logger(UpdateUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, dto: UpdateUnitDto, currentUser: User): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    Object.assign(unit, dto);
    await this.unitRepository.save(unit);

    this.logger.log(`Unit ${unit.id} updated by user ${currentUser.id}`);

    return unit;
  }
}
