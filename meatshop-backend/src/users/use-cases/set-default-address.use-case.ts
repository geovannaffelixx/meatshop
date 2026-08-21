import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';

@Injectable()
export class SetDefaultAddressUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async execute(addressId: number, currentUser: User): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: currentUser.id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.addressRepository.update(
      { user_id: currentUser.id, is_default: true },
      { is_default: false },
    );

    address.is_default = true;
    return this.addressRepository.save(address);
  }
}
