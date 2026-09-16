import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeliveryPersonAccessService } from './delivery-person-access.service';
import { MediaStorageService } from '../../storage/media-storage.service';

const MAX_PHOTOS = 4;

@Injectable()
export class VehiclePhotoService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly access: DeliveryPersonAccessService,
    private readonly storage: MediaStorageService,
  ) {}

  async add(vehicleId: number, url: string, actor: User): Promise<Vehicle> {
    const vehicle = await this.ownedVehicle(vehicleId, actor);
    const current = vehicle.photo_urls ?? [];
    if (current.length >= MAX_PHOTOS) {
      throw new BadRequestException(`The vehicle accepts at most ${MAX_PHOTOS} photos.`);
    }
    vehicle.photo_urls = [...current, url];
    return this.vehicles.save(vehicle);
  }

  async remove(vehicleId: number, filename: string, actor: User): Promise<Vehicle> {
    const vehicle = await this.ownedVehicle(vehicleId, actor);
    const url = (vehicle.photo_urls ?? []).find(
      (item) => path.basename(item) === path.basename(filename),
    );
    if (!url) throw new NotFoundException('Photo not found.');
    vehicle.photo_urls = vehicle.photo_urls.filter((item) => item !== url);
    const saved = await this.vehicles.save(vehicle);
    await this.storage.delete(url);
    return saved;
  }

  private async ownedVehicle(vehicleId: number, actor: User): Promise<Vehicle> {
    const person = await this.access.getOwnDeliveryPerson(actor.id);
    const vehicle = await this.vehicles.findOne({
      where: { id: vehicleId, delivery_person_id: person.id, is_enabled: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    return vehicle;
  }
}
