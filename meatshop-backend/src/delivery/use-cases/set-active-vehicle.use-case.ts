import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeliveryPersonAccessService } from '../services/delivery-person-access.service';

@Injectable()
export class SetActiveVehicleUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly deliveryPersonAccessService: DeliveryPersonAccessService,
  ) {}

  async execute(vehicleId: number, currentUser: User): Promise<Vehicle> {
    const deliveryPerson = await this.deliveryPersonAccessService.getOwnDeliveryPerson(
      currentUser.id,
    );

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, delivery_person_id: deliveryPerson.id },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.vehicleRepository.update(
      { delivery_person_id: deliveryPerson.id },
      { is_active: false },
    );

    vehicle.is_active = true;
    return this.vehicleRepository.save(vehicle);
  }
}
