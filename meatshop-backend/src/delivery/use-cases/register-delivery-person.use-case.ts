import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateDeliveryPersonDto } from '../dtos/create-delivery-person.dto';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryAffiliationType } from '../enums/delivery-affiliation-type.enum';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';

@Injectable()
export class RegisterDeliveryPersonUseCase {
  private readonly logger = new Logger(RegisterDeliveryPersonUseCase.name);

  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  async execute(dto: CreateDeliveryPersonDto, currentUser: User): Promise<DeliveryPerson> {
    const existing = await this.deliveryPersonRepository.findOne({
      where: { user_id: currentUser.id },
    });
    if (existing) {
      return existing;
    }

    const deliveryPerson = this.deliveryPersonRepository.create({
      user_id: currentUser.id,
      vehicle: dto.vehicle,
      affiliation_type: DeliveryAffiliationType.AUTONOMOUS,
      status: DeliveryPersonStatus.ACTIVE,
    });
    await this.deliveryPersonRepository.save(deliveryPerson);

    this.logger.log(`Delivery person profile ${deliveryPerson.id} registered`);

    return deliveryPerson;
  }
}
