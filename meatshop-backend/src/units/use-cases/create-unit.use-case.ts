import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { User } from '../../users/entities/user.entity';
import { CreateUnitDto } from '../dtos/create-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';

@Injectable()
export class CreateUnitUseCase {
  private readonly logger = new Logger(CreateUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
  ) {}

  async execute(dto: CreateUnitDto, currentUser: User): Promise<Unit> {
    await this.ensureCnpjIsUnique(dto.cnpj);

    const unit = this.unitRepository.create({
      ...dto,
      admin_id: currentUser.id,
    });
    await this.unitRepository.save(unit);

    await this.userUnitRepository.save(
      this.userUnitRepository.create({
        user_id: currentUser.id,
        unit_id: unit.id,
        local_role: LocalRole.ADMIN,
      }),
    );

    this.logger.log(`Unit ${unit.id} created by user ${currentUser.id}`);

    return unit;
  }

  private async ensureCnpjIsUnique(cnpj: string): Promise<void> {
    const existing = await this.unitRepository.findOne({ where: { cnpj } });
    if (existing) {
      throw new ConflictException('CNPJ already in use');
    }
  }
}
