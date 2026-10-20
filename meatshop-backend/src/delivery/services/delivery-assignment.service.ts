import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../../orders/entities/payment.entity';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { DeliveryType } from '../../orders/enums/delivery-type.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { assertPaymentAllowsPreparation } from '../../payments/payment-policy';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeliveryAffiliationType } from '../enums/delivery-affiliation-type.enum';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';

@Injectable()
export class DeliveryAssignmentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly codes: DeliveryCodeService,
  ) {}

  assign(orderId: number, personId: number, unitId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const person = await manager.findOne(DeliveryPerson, {
        where: { id: personId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!person || person.status !== DeliveryPersonStatus.ACTIVE) {
        throw new BadRequestException('O entregador precisa estar aprovado.');
      }
      const user = await manager.findOne(User, { where: { id: person.user_id, is_active: true } });
      if (!user || !person.is_online) {
        throw new BadRequestException('O entregador precisa estar online.');
      }
      const vehicle = await manager.findOne(Vehicle, {
        where: { delivery_person_id: person.id, is_active: true, is_enabled: true },
      });
      if (!vehicle) throw new BadRequestException('O entregador precisa de um veículo ativo.');
      const active = await manager.findOne(Order, {
        where: {
          delivery_person_id: person.id,
          status: In([OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]),
          delivery_status: In([DeliveryStatus.PICKUP, DeliveryStatus.ON_THE_WAY]),
        },
      });
      if (active) throw new ConflictException('O entregador já possui uma entrega em andamento.');
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .addSelect('order.delivery_code_hash')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!order || (unitId !== undefined && order.unit_id !== unitId)) {
        throw new NotFoundException('Pedido não encontrado.');
      }
      if (
        order.delivery_type !== DeliveryType.DELIVERY ||
        order.status !== OrderStatus.READY ||
        order.delivery_status !== DeliveryStatus.WAITING_DELIVERY_PERSON ||
        order.delivery_person_id
      ) {
        throw new ConflictException('O pedido não está disponível para atribuição.');
      }
      if (unitId !== undefined || person.affiliation_type === DeliveryAffiliationType.UNIT) {
        const membership = await manager.findOne(UserUnit, {
          where: {
            user_id: person.user_id,
            unit_id: order.unit_id,
            local_role: LocalRole.DELIVERY,
            status: UserUnitStatus.ACTIVE,
          },
        });
        if (!membership)
          throw new BadRequestException('O entregador não está ativo nesta unidade.');
      }
      const payment = await manager.findOne(Payment, { where: { order_id: order.id } });
      assertPaymentAllowsPreparation(order.payment_status, payment?.method);
      const pickupCode = this.codes.issue(order, 'PICKUP');
      const deliveryCode = order.delivery_code_hash ? null : this.codes.issue(order, 'DELIVERY');
      order.delivery_person_id = person.id;
      order.delivery_status = DeliveryStatus.PICKUP;
      order.delivery_step = DeliveryStep.PICKUP;
      order.pickup_verified_at = null;
      order.tracking_session_id = null;
      order.tracking_consent_at = null;
      order.tracking_revoked_at = new Date();
      await manager.save(Order, order);
      return { order, pickupCode, deliveryCode, user };
    });
  }
}
