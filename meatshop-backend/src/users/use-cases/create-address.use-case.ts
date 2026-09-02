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
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly unitAddressService: UnitAddressService,
  ) {}

  async execute(dto: CreateAddressDto, currentUser: User): Promise<Address> {
    const resolved = await this.unitAddressService.lookupByCep(dto.zip_code);
    const isFirstAddress = await this.isUsersFirstAddress(currentUser.id);
    const shouldBeDefault = isFirstAddress || dto.is_default === true;

    if (shouldBeDefault) {
      await this.unsetCurrentDefault(currentUser.id);
    }

    const address = this.addressRepository.create({
      ...dto,
      user_id: currentUser.id,
      is_default: shouldBeDefault,
      zip_code: resolved.zip_code,
      street: resolved.street || dto.street.trim(),
      neighborhood: resolved.neighborhood || dto.neighborhood.trim(),
      city: resolved.city,
      state: resolved.state,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
    });

    return this.addressRepository.save(address);
  }

  private async isUsersFirstAddress(userId: number): Promise<boolean> {
    const count = await this.addressRepository.count({
      where: { user_id: userId },
    });
    return count === 0;
  }

  private async unsetCurrentDefault(userId: number): Promise<void> {
    await this.addressRepository.update(
      { user_id: userId, is_default: true },
      { is_default: false },
    );
  }
}
