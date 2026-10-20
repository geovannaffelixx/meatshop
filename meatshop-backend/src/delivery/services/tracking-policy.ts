import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import type { User } from '../../users/entities/user.entity';
import type { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';
import type { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { UnitPermission } from '../../common/enums/unit-permission.enum';

export function isTrackable(order: Order): boolean {
  return (
    [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY].includes(order.status) &&
    [DeliveryStatus.PICKUP, DeliveryStatus.ON_THE_WAY].includes(order.delivery_status!) &&
    order.delivery_person_id != null
  );
}
export async function assertTrackingAccess(
  order: Order,
  user: User,
  people: Repository<DeliveryPerson>,
  units: UnitAuthorizationService,
): Promise<void> {
  if (!user.is_active) throw new ForbiddenException('Account inactive');
  if (order.client_id === user.id) return;
  const person = await people.findOne({
    where: { user_id: user.id, status: DeliveryPersonStatus.ACTIVE },
  });
  if (person && person.id === order.delivery_person_id) {
    if (person.affiliation_type === 'UNIT')
      await units.assertActiveDeliveryMembership(user.id, order.unit_id);
    return;
  }
  await units.assertHasPermission(user, order.unit_id, UnitPermission.VIEW_DELIVERIES);
}
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
