import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeliveryPersonAccessService } from './delivery-person-access.service';

const VEHICLE_UPLOAD_PREFIX = '/uploads/vehicles/';
const MAX_PHOTOS = 4;

@Injectable()
export class VehiclePhotoService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly access: DeliveryPersonAccessService,
  ) {}

  async add(vehicleId: number, filename: string, actor: User): Promise<Vehicle> {
    const vehicle = await this.ownedVehicle(vehicleId, actor);
    const current = vehicle.photo_urls ?? [];
    if (current.length >= MAX_PHOTOS) {
      throw new BadRequestException(`O veículo aceita no máximo ${MAX_PHOTOS} fotos.`);
    }
    vehicle.photo_urls = [...current, `${VEHICLE_UPLOAD_PREFIX}${filename}`];
    return this.vehicles.save(vehicle);
  }

  async remove(vehicleId: number, filename: string, actor: User): Promise<Vehicle> {
    const vehicle = await this.ownedVehicle(vehicleId, actor);
    const url = `${VEHICLE_UPLOAD_PREFIX}${path.basename(filename)}`;
    if (!(vehicle.photo_urls ?? []).includes(url))
      throw new NotFoundException('Foto não encontrada.');
    vehicle.photo_urls = vehicle.photo_urls.filter((item) => item !== url);
    const saved = await this.vehicles.save(vehicle);
    await fs.promises
      .unlink(path.join(process.cwd(), 'uploads', 'vehicles', path.basename(filename)))
      .catch(() => undefined);
    return saved;
  }

  private async ownedVehicle(vehicleId: number, actor: User): Promise<Vehicle> {
    const person = await this.access.getOwnDeliveryPerson(actor.id);
    const vehicle = await this.vehicles.findOne({
      where: { id: vehicleId, delivery_person_id: person.id, is_enabled: true },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');
    return vehicle;
  }
}
