import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';

@Injectable()
export class DeliveryPersonAccessService {
  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  async getOwnDeliveryPerson(userId: number): Promise<DeliveryPerson> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { user_id: userId },
    });

    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person profile not found');
    }

    return deliveryPerson;
  }

  async getOwnActiveDeliveryPerson(userId: number): Promise<DeliveryPerson> {
    const deliveryPerson = await this.getOwnDeliveryPerson(userId);

    if (deliveryPerson.status !== DeliveryPersonStatus.ACTIVE) {
      throw new ForbiddenException('Your delivery person profile is not active');
    }

    return deliveryPerson;
  }
}
