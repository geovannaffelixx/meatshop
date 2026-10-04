import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryType } from '../../orders/enums/delivery-type.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { Vehicle } from '../entities/vehicle.entity';

@Injectable()
export class ListLiveDeliveriesUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryTracking)
    private readonly trackingRepository: Repository<DeliveryTracking>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, currentUser: User) {
    const generatedAt = new Date();
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.VIEW_DELIVERIES,
    );

    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    const orders = await this.orderRepository.find({
      where: {
        unit_id: unitId,
        delivery_type: DeliveryType.DELIVERY,
        status: In([OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]),
      },
      relations: {
        client: true,
        address: true,
        delivery_person: { user: true },
      },
      order: { order_date: 'ASC' },
    });

    const orderIds = orders.map(({ id }) => id);
    const deliveryPersonIds = orders
      .map(({ delivery_person_id }) => delivery_person_id)
      .filter((id): id is number => id !== null);

    const latestLocations = orderIds.length
      ? await this.trackingRepository
          .createQueryBuilder('tracking')
          .distinctOn(['tracking.order_id'])
          .where('tracking.order_id IN (:...orderIds)', { orderIds })
          .orderBy('tracking.order_id', 'ASC')
          .addOrderBy('tracking.created_at', 'DESC')
          .getMany()
      : [];
    const activeVehicles = deliveryPersonIds.length
      ? await this.vehicleRepository.find({
          where: {
            delivery_person_id: In(deliveryPersonIds),
            is_active: true,
          },
        })
      : [];

    const locationsByOrder = new Map(latestLocations.map((item) => [item.order_id, item]));
    const vehiclesByDeliveryPerson = new Map(
      activeVehicles.map((item) => [item.delivery_person_id, item]),
    );

    return {
      unit: {
        id: unit.id,
        name: unit.name,
        latitude: unit.latitude === null ? null : Number(unit.latitude),
        longitude: unit.longitude === null ? null : Number(unit.longitude),
      },
      deliveries: orders.map((order) => {
        const candidate = locationsByOrder.get(order.id);
        const location =
          order.delivery_person?.is_online &&
          order.delivery_person.status === 'ACTIVE' &&
          order.tracking_consent_at &&
          !order.tracking_revoked_at &&
          candidate?.delivery_person_id === order.delivery_person_id &&
          candidate &&
          candidate.created_at >= order.tracking_consent_at
            ? candidate
            : undefined;
        const vehicle = order.delivery_person_id
          ? vehiclesByDeliveryPerson.get(order.delivery_person_id)
          : undefined;
        const address = order.destination_snapshot ?? order.address;

        return {
          orderId: order.id,
          status: order.status,
          deliveryStatus: order.delivery_status,
          deliveryStep: order.delivery_step,
          orderDate: order.order_date,
          scheduledDeliveryDate: order.scheduled_delivery_date,
          client: {
            id: order.client_id,
            name: order.client?.name ?? 'Customer',
          },
          destination: address
            ? {
                label: [
                  `${address.street}, ${address.number}`,
                  address.neighborhood,
                  `${address.city} - ${address.state}`,
                ].join(', '),
                latitude: address.latitude == null ? null : Number(address.latitude),
                longitude: address.longitude == null ? null : Number(address.longitude),
              }
            : null,
          deliveryPerson: order.delivery_person
            ? {
                id: order.delivery_person.id,
                name: order.delivery_person.user?.name ?? 'Delivery Person',
                rating:
                  order.delivery_person.average_rating === null
                    ? null
                    : Number(order.delivery_person.average_rating),
                vehicle: vehicle
                  ? {
                      type: vehicle.type,
                      model: vehicle.model,
                      plate: vehicle.plate,
                      color: vehicle.color,
                    }
                  : null,
              }
            : null,
          pickupVerification: {
            required: Boolean(order.delivery_person_id),
            verifiedAt: order.pickup_verified_at,
            expiresAt: order.pickup_code_expires_at,
            lockedUntil: order.pickup_code_locked_until,
          },
          deliveryVerification: {
            required: true,
            verifiedAt: order.delivery_verified_at,
            expiresAt: order.delivery_code_expires_at,
            lockedUntil: order.delivery_code_locked_until,
          },
          location: location
            ? {
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
                recordedAt: location.created_at,
                capturedAt: location.captured_at ?? location.created_at,
                accuracy: location.accuracy == null ? null : Number(location.accuracy),
                pointId: location.id,
              }
            : null,
        };
      }),
      generatedAt,
    };
  }
}
