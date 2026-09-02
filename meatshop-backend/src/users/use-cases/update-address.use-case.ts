import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateAddressDto } from '../dtos/update-address.dto';
import { Address } from '../entities/address.entity';
import { UnitAddressService } from '../../units/services/unit-address.service';

@Injectable()
export class UpdateAddressUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly unitAddressService: UnitAddressService,
  ) {}

  async execute(addressId: number, dto: UpdateAddressDto, currentUser: User): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: currentUser.id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    Object.assign(address, dto);
    if (dto.state != null) {
      address.state = dto.state.trim().toUpperCase();
    }
    if (dto.zip_code != null) {
      const resolved = await this.unitAddressService.lookupByCep(dto.zip_code);
      address.zip_code = resolved.zip_code;
      address.street = resolved.street || address.street;
      address.neighborhood = resolved.neighborhood || address.neighborhood;
      address.city = resolved.city;
      address.state = resolved.state;
      address.latitude = resolved.latitude;
      address.longitude = resolved.longitude;
    }
    return this.addressRepository.save(address);
  }
}
