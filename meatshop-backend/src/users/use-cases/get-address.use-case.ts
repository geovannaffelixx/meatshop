import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../entities/address.entity';

@Injectable()
export class GetAddressUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async execute(addressId: number, userId: number): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }
}
