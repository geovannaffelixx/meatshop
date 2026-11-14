import { assertPaymentAllowsPreparation } from '../../payments/payment-policy';
import { Payment } from '../entities/payment.entity';
import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { DeliveryType } from '../enums/delivery-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { DeliveryCodeService } from './delivery-code.service';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { DeliveryStep } from '../enums/delivery-step.enum';

@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly orderStatusHistoryRepository: Repository<OrderStatusHistory>,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
    private readonly codes: DeliveryCodeService,
  ) {}

  async transition(
    order: Order,
    status: OrderStatus,
    updatedBy: number | null,
    counterPickupCode?: string,
  ): Promise<Order> {
    const result = await this.orderRepository.manager.transaction(async (manager) => {
      const current = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .addSelect('order.tracking_session_id')
        .addSelect('order.delivery_code_hash')
        .addSelect('order.pickup_code_hash')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: order.id })
        .getOne();
      if (
        !current ||
        current.status !== order.status ||
        [OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(current.status) ||
        current.delivery_person_id !== order.delivery_person_id
      ) {
        throw new ConflictException('Order changed; refresh before continuing');
      }
      const payment = await manager.findOne(Payment, {
        where: { order_id: current.id },
      });
      assertPaymentAllowsPreparation(current.payment_status, payment?.method);
      if (status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Use the cancellation endpoint');
      }
      const courierPickup =
        current.delivery_type === DeliveryType.DELIVERY && status === OrderStatus.OUT_FOR_DELIVERY;
      const customerDelivery =
        current.delivery_type === DeliveryType.DELIVERY && status === OrderStatus.DELIVERED;
      if (courierPickup || customerDelivery) {
        const expectedStatus = courierPickup ? OrderStatus.READY : OrderStatus.OUT_FOR_DELIVERY;
        const expectedDelivery = courierPickup ? DeliveryStatus.PICKUP : DeliveryStatus.ON_THE_WAY;
        if (
          current.status !== expectedStatus ||
          current.delivery_status !== expectedDelivery ||
          !current.delivery_person_id
        ) {
          throw new ConflictException('O pedido mudou. Atualize a entrega antes de continuar.');
        }
        if (!counterPickupCode)
          throw new BadRequestException({
            code: 'DELIVERY_CODE_REQUIRED',
            message: 'Informe o código de seis dígitos.',
          });
        try {
          await this.codes.verify(
            current,
            courierPickup ? 'PICKUP' : 'DELIVERY',
            counterPickupCode,
            manager.getRepository(Order),
          );
        } catch (error) {
          if (error instanceof HttpException) return { error };
          throw error;
        }
      }
      if (current.delivery_type === DeliveryType.PICKUP && status === OrderStatus.DELIVERED) {
        if (current.status !== OrderStatus.READY) {
          throw new BadRequestException('O pedido ainda não está pronto para retirada.');
        }
        if (
          ![PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(current.payment_status)
        ) {
          throw new BadRequestException({
            code: 'PICKUP_PAYMENT_REQUIRED',
            message: 'Registre o recebimento do pagamento antes de confirmar a retirada.',
          });
        }
        if (!counterPickupCode) {
          throw new BadRequestException({
            code: 'PICKUP_CODE_REQUIRED',
            message: 'Solicite ao cliente o código de retirada de seis dígitos.',
          });
        }
        try {
          await this.codes.verify(
            current,
            'DELIVERY',
            counterPickupCode,
            manager.getRepository(Order),
          );
        } catch (error) {
          // Commit failed-attempt counters, but leave the order ready for pickup.
          // Unexpected persistence errors still roll the whole transaction back.
          if (error instanceof HttpException) return { error };
          throw error;
        }
      }
      // Keep the locked row's consent state so concurrent revocations are preserved.
      current.status = status;
      current.delivery_status = order.delivery_status;
      current.delivery_step = order.delivery_step;
      if (courierPickup) {
        current.delivery_status = DeliveryStatus.ON_THE_WAY;
        current.delivery_step = DeliveryStep.DELIVERING;
      }
      if (customerDelivery) current.delivery_status = DeliveryStatus.DELIVERED;
      if (status === OrderStatus.DELIVERED) {
        current.tracking_session_id = null;
        current.tracking_revoked_at = new Date();
        current.delivery_step = null;
      }
      await manager.save(Order, current);
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          order_id: current.id,
          status,
          updated_by: updatedBy,
        }),
      );
      return { order: current };
    });

    if ('error' in result) throw result.error;
    order = result.order;

    await this.sendOrderStatusNotificationUseCase
      .notifyCustomerOfStatusChange(order)
      .catch((error) =>
        this.logger.warn(
          `Failed to notify customer of order ${order.id} status change: ${error.message}`,
        ),
      );

    return order;
  }
}
