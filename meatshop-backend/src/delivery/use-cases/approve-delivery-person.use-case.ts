import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';

@Injectable()
export class ApproveDeliveryPersonUseCase {
  private readonly logger = new Logger(ApproveDeliveryPersonUseCase.name);

  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
  ) {}

  async execute(deliveryPersonId: number, currentUser: User): Promise<DeliveryPerson> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { id: deliveryPersonId },
    });
    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person not found');
    }

    if (deliveryPerson.status !== DeliveryPersonStatus.PENDING) {
      throw new BadRequestException('Delivery person is not pending approval');
    }

    await this.orderAuthorizationService.assertCanApproveDeliveryPerson(currentUser);

    deliveryPerson.status = DeliveryPersonStatus.ACTIVE;
    await this.deliveryPersonRepository.save(deliveryPerson);

    this.logger.log(`Delivery person ${deliveryPersonId} approved by user ${currentUser.id}`);

    return deliveryPerson;
  }
}
