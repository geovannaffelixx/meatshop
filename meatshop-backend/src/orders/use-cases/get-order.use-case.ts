import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { DeliveryCodeService } from '../services/delivery-code.service';

@Injectable()
export class GetOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly deliveryCodeService: DeliveryCodeService,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<OrderResponseDto> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.delivery_code_ciphertext')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.unit', 'unit')
      .where('order.id = :orderId', { orderId })
      .getOne();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.client_id !== currentUser.id && currentUser.global_role !== GlobalRole.SUPER_ADMIN) {
      await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    }

    const items = await this.orderItemRepository.find({
      where: { order_id: orderId },
      relations: ['product'],
    });
    const payment = await this.paymentRepository.findOne({
      where: { order_id: orderId },
    });

    const deliveryCode =
      order.client_id === currentUser.id
        ? this.deliveryCodeService.revealDeliveryCode(order)
        : null;
    return OrderResponseDto.fromEntity(order, items, payment, deliveryCode);
  }
}
