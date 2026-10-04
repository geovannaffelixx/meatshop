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
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    private readonly geocoding: UnitAddressService,
  ) {}

  async execute(id: number, dto: UpdateAddressDto, user: User): Promise<Address> {
    const address = await this.addresses.findOne({ where: { id, user_id: user.id } });
    if (!address) throw new NotFoundException('Address not found');
    const coordinates = await this.geocoding.coordinatesFor(dto, address);
    Object.assign(address, dto, coordinates);
    address.state = address.state.trim().toUpperCase();
    address.zip_code = address.zip_code.replace(/\D/g, '');
    return this.addresses.save(address);
  }
}
