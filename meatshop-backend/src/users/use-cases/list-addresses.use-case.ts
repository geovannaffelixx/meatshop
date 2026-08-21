import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../entities/address.entity';

@Injectable()
export class ListAddressesUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async execute(userId: number): Promise<Address[]> {
    return this.addressRepository.find({
      where: { user_id: userId },
      order: { id: 'ASC' },
    });
  }
}
