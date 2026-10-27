import type { SelectQueryBuilder } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { FilterPanelOrdersDto } from '../dtos/filter-panel-orders.dto';
import { paginatedResult, searchPattern } from '../../common/dtos/panel-list-query.dto';
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

  async panel(currentUser: User, filters: FilterPanelOrdersDto) {
    const query = this.orderRepository
      .createQueryBuilder('orders')
      .leftJoinAndSelect('orders.client', 'client')
      .leftJoinAndSelect('orders.delivery_person', 'deliveryPerson')
      .leftJoinAndSelect('deliveryPerson.user', 'deliveryUser');
    if (currentUser.global_role !== GlobalRole.SUPER_ADMIN) {
      const ids = await this.unitAuthorizationService.getManagedUnitIds(
        currentUser.id,
        UnitPermission.MANAGE_ORDERS,
      );
      query.andWhere('(orders.unit_id = ANY(:unitIds) OR orders.client_id = :actor)', {
        unitIds: ids,
        actor: currentUser.id,
      });
    }
    this.applyPanelFilters(query, filters);
    const [orders, total] = await query
      .orderBy('orders.order_date', 'DESC')
      .addOrderBy('orders.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
    const payments = orders.length
      ? await this.orderRepository.manager.find(Payment, {
          where: { order_id: In(orders.map((order) => order.id)) },
        })
      : [];
    const methods = new Map(payments.map((payment) => [payment.order_id, payment.method]));
    return paginatedResult(
      orders.map((order) =>
        Object.assign(order, { payment_method: methods.get(order.id) ?? null }),
      ),
      total,
      filters,
    );
  }

  private applyPanelFilters(query: SelectQueryBuilder<Order>, filters: FilterPanelOrdersDto) {
    if (filters.unit_id) query.andWhere('orders.unit_id = :unitId', { unitId: filters.unit_id });
    if (filters.search?.trim())
      query.andWhere('(client.name ILIKE :search OR CAST(orders.id AS TEXT) ILIKE :search)', {
        search: searchPattern(filters.search),
      });
    if (filters.order_id?.trim())
      query.andWhere('CAST(orders.id AS TEXT) LIKE :orderId', {
        orderId: searchPattern(filters.order_id),
      });
    if (filters.status) query.andWhere('orders.status = :status', { status: filters.status });
    for (const [key, column] of [
      ['order', 'order_date'],
      ['scheduled', 'scheduled_delivery_date'],
    ] as const) {
      const from = filters[`${key}_from`];
      const to = filters[`${key}_to`];
      if (from)
        query.andWhere(`orders.${column} >= CAST(:${key}From AS date) + INTERVAL '3 hours'`, {
          [`${key}From`]: from,
        });
      if (to)
        query.andWhere(`orders.${column} < CAST(:${key}To AS date) + INTERVAL '1 day 3 hours'`, {
          [`${key}To`]: to,
        });
    }
  }

  async mobile(user: User, page: number, finished = false) {
    const rows = await this.mobileRows(user, page, finished);
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
      data: orders.map((order) => this.mobileDto(order, items, payments, reviews, settlements)),
      has_more: rows.length > 50,
    };
  }

  private async mobileRows(user: User, page: number, finished: boolean) {
    if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
      throw new BadRequestException('Invalid page');
    return await this.orderRepository
      .createQueryBuilder('o')
      .addSelect('o.delivery_code_ciphertext')
      .leftJoinAndSelect('o.unit', 'unit')
      .leftJoinAndSelect('o.delivery_person', 'deliveryPerson')
      .leftJoinAndSelect('deliveryPerson.user', 'deliveryUser')
      .where('o.client_id=:client', { client: user.id })
      .andWhere(finished ? "o.status IN ('DELIVERED','CANCELLED')" : 'true')
      .orderBy("CASE WHEN o.status NOT IN ('DELIVERED','CANCELLED') THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('o.order_date', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .offset(page * 50)
      .limit(51)
      .getMany();
  }

  private mobileDto(
    order: Order,
    items: OrderItem[],
    payments: Payment[],
    reviews: Review[],
    settlements: { order_id: number; paid_at: Date | null }[],
  ) {
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
      reviewed_product_ids: ownReviews.flatMap((r) => (r.product_id == null ? [] : [r.product_id])),
    };
    return dto;
  }

  private async list(currentUser: User): Promise<Order[]> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return this.orderRepository.find({
        relations: ['client', 'delivery_person', 'delivery_person.user'],
        order: { order_date: 'DESC' },
      });
    }

    const managedUnitIds = await this.unitAuthorizationService.getManagedUnitIds(
      currentUser.id,
      UnitPermission.MANAGE_ORDERS,
    );
    if (managedUnitIds.length > 0) {
      return this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.client', 'client')
        .leftJoinAndSelect('order.delivery_person', 'deliveryPerson')
        .leftJoinAndSelect('deliveryPerson.user', 'deliveryUser')
        .where('order.unit_id IN (:...unitIds)', { unitIds: managedUnitIds })
        .orWhere('order.client_id = :userId', { userId: currentUser.id })
        .orderBy('order.order_date', 'DESC')
        .getMany();
    }

    return this.orderRepository.find({
      where: { client_id: currentUser.id },
      relations: ['client', 'delivery_person', 'delivery_person.user'],
      order: { order_date: 'DESC' },
    });
  }
}
