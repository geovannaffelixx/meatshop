import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateAddressDto } from '../dtos/create-address.dto';
import { Address } from '../entities/address.entity';
import { UnitAddressService } from '../../units/services/unit-address.service';

@Injectable()
export class CreateAddressUseCase {
  constructor(
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    private readonly geocoding: UnitAddressService,
  ) {}

  async execute(dto: CreateAddressDto, user: User): Promise<Address> {
    const coordinates = await this.geocoding.coordinatesFor(dto);
    return this.addresses.manager.transaction(async (manager) => {
      await manager.findOne(User, { where: { id: user.id }, lock: { mode: 'pessimistic_write' } });
      const first = (await manager.count(Address, { where: { user_id: user.id } })) === 0;
      const isDefault = first || dto.is_default === true;
      if (isDefault)
        await manager.update(
          Address,
          { user_id: user.id, is_default: true },
          { is_default: false },
        );
      return manager.save(
        Address,
        manager.create(Address, {
          ...dto,
          ...coordinates,
          user_id: user.id,
          is_default: isDefault,
          state: dto.state.trim().toUpperCase(),
          zip_code: dto.zip_code.replace(/\D/g, ''),
        }),
      );
    });
  }
}
