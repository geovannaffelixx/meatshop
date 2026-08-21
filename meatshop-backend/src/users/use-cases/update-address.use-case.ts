import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateAddressDto } from '../dtos/update-address.dto';
import { Address } from '../entities/address.entity';

@Injectable()
export class UpdateAddressUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async execute(
    addressId: number,
    dto: UpdateAddressDto,
    currentUser: User,
  ): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: currentUser.id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }
}
