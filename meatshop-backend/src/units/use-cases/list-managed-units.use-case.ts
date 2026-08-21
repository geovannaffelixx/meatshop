import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ManagedUnitDto } from '../dtos/managed-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class ListManagedUnitsUseCase {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(currentUser: User): Promise<ManagedUnitDto[]> {
    const unitIds = await this.unitAuthorizationService.getManagedUnitIds(currentUser.id);
    if (unitIds.length === 0) {
      return [];
    }

    const units = await this.unitRepository.find({ where: { id: In(unitIds) } });
    return units.map((unit) => ManagedUnitDto.fromEntity(unit));
  }
}
