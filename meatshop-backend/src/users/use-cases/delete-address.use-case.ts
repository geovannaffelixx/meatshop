import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';
import { Order } from '../../orders/entities/order.entity';

@Injectable()
export class DeleteAddressUseCase {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async execute(addressId: number, currentUser: User): Promise<void> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: currentUser.id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const isUsedByOrder = await this.orderRepository.exist({
      where: { address_id: address.id, client_id: currentUser.id },
    });
    if (isUsedByOrder) {
      throw new ConflictException({
        code: 'ADDRESS_IN_USE',
        message: 'Este endereço está vinculado ao histórico de pedidos e não pode ser excluído.',
      });
    }

    await this.addressRepository.remove(address);

    if (address.is_default) {
      await this.promoteAnotherAddressToDefault(currentUser.id);
    }
  }

  private async promoteAnotherAddressToDefault(userId: number): Promise<void> {
    const remaining = await this.addressRepository.findOne({
      where: { user_id: userId },
      order: { id: 'ASC' },
    });

    if (remaining) {
      remaining.is_default = true;
      await this.addressRepository.save(remaining);
    }
  }
}
