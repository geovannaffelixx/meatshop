import { Payment } from '../entities/payment.entity';
import { In } from 'typeorm';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { DeliveryCodeService } from '../services/delivery-code.service';
import { Review } from '../../reviews/entities/review.entity';

@Injectable()
export class ListOrderHistoryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly deliveryCodes: DeliveryCodeService,
  ) {}

  async execute(currentUser: User): Promise<(Order & { payment_method?: string | null })[]> {
    const orders = await this.list(currentUser);
    if (!orders.length) return orders;
    const payments = await this.orderRepository.manager.find(Payment, {
      where: { order_id: In(orders.map((o) => o.id)) },
    });
    const methods = new Map(payments.map((p) => [p.order_id, p.method]));
    return orders.map((o) => Object.assign(o, { payment_method: methods.get(o.id) ?? null }));
  }

  async mobile(user: User, page: number) {
    if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
      throw new BadRequestException('Invalid page');
    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .addSelect('o.delivery_code_ciphertext')
      .leftJoinAndSelect('o.unit', 'unit')
      .where('o.client_id=:client', { client: user.id })
      .orderBy("CASE WHEN o.status NOT IN ('DELIVERED','CANCELLED') THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('o.order_date', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .offset(page * 50)
      .limit(51)
      .getMany();
    const orders = rows.slice(0, 50);
    const ids = orders.map((o) => o.id);
    if (!ids.length) return { data: [], has_more: false };
    const [items, payments, reviews, settlements] = await Promise.all([
      this.orderRepository.manager.find(OrderItem, {
        where: { order_id: In(ids) },
        relations: ['product'],
      }),
      this.orderRepository.manager.find(Payment, { where: { order_id: In(ids) } }),
      this.orderRepository.manager.find(Review, {
        where: { order_id: In(ids), client_id: user.id },
      }),
      this.orderRepository.manager.query(
        'SELECT order_id,paid_at FROM delivery_settlements WHERE order_id=ANY($1::int[])',
        [ids],
      ),
    ]);
    return {
      data: orders.map((order) => {
        const dto = OrderResponseDto.fromEntity(
          order,
          items.filter((i) => i.order_id === order.id),
          payments.find((p) => p.order_id === order.id) ?? null,
          this.deliveryCodes.revealDeliveryCode(order),
        );
        dto.delivery_paid_at =
          settlements.find((s: { order_id: number }) => s.order_id === order.id)?.paid_at ?? null;
        const ownReviews = reviews.filter((r) => r.order_id === order.id);
        dto.review_status = {
          unit_reviewed: ownReviews.some((r) => r.product_id === null),
          reviewed_product_ids: ownReviews.flatMap((r) =>
            r.product_id == null ? [] : [r.product_id],
          ),
        };
        return dto;
      }),
      has_more: rows.length > 50,
    };
  }

  private async list(currentUser: User): Promise<Order[]> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return this.orderRepository.find({
        relations: ['client'],
        order: { order_date: 'DESC' },
      });
    }

    const managedUnitIds = await this.unitAuthorizationService.getManagedUnitIds(currentUser.id);
    if (managedUnitIds.length > 0) {
      return this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.client', 'client')
        .where('order.unit_id IN (:...unitIds)', { unitIds: managedUnitIds })
        .orWhere('order.client_id = :userId', { userId: currentUser.id })
        .orderBy('order.order_date', 'DESC')
        .getMany();
    }

    return this.orderRepository.find({
      where: { client_id: currentUser.id },
      relations: ['client'],
      order: { order_date: 'DESC' },
    });
  }
}
