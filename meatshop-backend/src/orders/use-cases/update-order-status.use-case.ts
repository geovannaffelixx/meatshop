import { DeliveryType } from '../enums/delivery-type.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';
import { Order } from '../entities/order.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { OrderStatusService } from '../services/order-status.service';
import { OrderStatusTransitionValidator } from '../validators/order-status-transition.validator';
import { DeliveryCodeService } from '../services/delivery-code.service';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
    private readonly transitionValidator: OrderStatusTransitionValidator,
    private readonly codes: DeliveryCodeService,
  ) {}

  async execute(orderId: number, dto: UpdateOrderStatusDto, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    if (
      order.delivery_type === DeliveryType.DELIVERY &&
      [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED].includes(dto.status)
    ) {
      throw new BadRequestException('Use a validação dos códigos de retirada e entrega.');
    }
    this.transitionValidator.assertValid(order.status, dto.status, order.delivery_type);
    await this.verifyCounterPickup(order, dto);

    return this.orderStatusService.transition(order, dto.status, currentUser.id);
  }

  private async verifyCounterPickup(order: Order, dto: UpdateOrderStatusDto): Promise<void> {
    if (order.delivery_type !== DeliveryType.PICKUP || dto.status !== OrderStatus.DELIVERED) return;
    if (!dto.code)
      throw new BadRequestException({
        code: 'PICKUP_CODE_REQUIRED',
        message: 'Ask the customer for the pickup code.',
      });
    const secured = await this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.delivery_code_hash')
      .where('order.id = :id', { id: order.id })
      .getOneOrFail();
    await this.codes.verify(secured, 'DELIVERY', dto.code);
  }
}
