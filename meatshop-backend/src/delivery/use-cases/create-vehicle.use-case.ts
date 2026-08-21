import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateVehicleDto } from '../dtos/create-vehicle.dto';
import { Vehicle } from '../entities/vehicle.entity';
import { DeliveryPersonAccessService } from '../services/delivery-person-access.service';

@Injectable()
export class CreateVehicleUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly deliveryPersonAccessService: DeliveryPersonAccessService,
  ) {}

  async execute(dto: CreateVehicleDto, currentUser: User): Promise<Vehicle> {
    const deliveryPerson = await this.deliveryPersonAccessService.getOwnDeliveryPerson(
      currentUser.id,
    );

    const existingCount = await this.vehicleRepository.count({
      where: { delivery_person_id: deliveryPerson.id },
    });

    const vehicle = this.vehicleRepository.create({
      ...dto,
      delivery_person_id: deliveryPerson.id,
      is_active: existingCount === 0,
    });

    return this.vehicleRepository.save(vehicle);
  }
}
