import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { User } from '../../users/entities/user.entity';
import { CreateUnitDto } from '../dtos/create-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAddressService } from '../services/unit-address.service';

@Injectable()
export class CreateUnitUseCase {
  private readonly logger = new Logger(CreateUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly unitAddressService: UnitAddressService,
  ) {}

  async execute(dto: CreateUnitDto, currentUser: User): Promise<Unit> {
    await this.ensureCnpjIsUnique(dto.cnpj);
    const address = await this.unitAddressService.lookupByCep(dto.zip_code);

    const unit = await this.dataSource.transaction(async (manager) => {
      const unit = await manager.save(
        Unit,
        manager.create(Unit, {
          ...dto,
          zip_code: address.zip_code,
          street: dto.street || address.street || null,
          neighborhood: dto.neighborhood || address.neighborhood || null,
          city: dto.city || address.city,
          state: dto.state || address.state,
          latitude: address.latitude,
          longitude: address.longitude,
          admin_id: currentUser.id,
        }),
      );

      await manager.save(
        UserUnit,
        manager.create(UserUnit, {
          user_id: currentUser.id,
          unit_id: unit.id,
          local_role: LocalRole.OWNER,
        }),
      );

      return unit;
    });

    this.logger.log(`Unit ${unit.id} created by user ${currentUser.id}`);

    return unit;
  }

  private async ensureCnpjIsUnique(cnpj: string): Promise<void> {
    const existing = await this.unitRepository.findOne({ where: { cnpj } });
    if (existing) {
      throw new ConflictException({
        code: 'CNPJ_ALREADY_EXISTS',
        message: 'Já existe um açougue cadastrado com este CNPJ.',
      });
    }
  }
}
