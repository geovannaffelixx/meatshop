import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateDeliveryPersonDto } from '../dtos/create-delivery-person.dto';
import { DeliveryPerson } from '../entities/delivery-person.entity';

@Injectable()
export class RegisterDeliveryPersonUseCase {
  private readonly logger = new Logger(RegisterDeliveryPersonUseCase.name);

  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  async execute(
    dto: CreateDeliveryPersonDto,
    currentUser: User,
  ): Promise<DeliveryPerson> {
    const existing = await this.deliveryPersonRepository.findOne({
      where: { user_id: currentUser.id },
    });
    if (existing) {
      throw new BadRequestException('You already have a delivery person profile');
    }

    const deliveryPerson = this.deliveryPersonRepository.create({
      user_id: currentUser.id,
      vehicle: dto.vehicle,
    });
    await this.deliveryPersonRepository.save(deliveryPerson);

    this.logger.log(`Delivery person profile ${deliveryPerson.id} registered`);

    return deliveryPerson;
  }
}
