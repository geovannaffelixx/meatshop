import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { RankedListQueryDto } from '../dtos/ranked-list-query.dto';

export type CustomerInsightItem = {
  client_id: number;
  client_name: string;
  order_count: number;
  total_spent: number;
  last_order_at: Date;
};

const DEFAULT_LIMIT = 10;

@Injectable()
export class GetCustomerInsightsUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: RankedListQueryDto, currentUser: User): Promise<CustomerInsightItem[]> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.client', 'client')
      .where('order.unit_id = :unitId', { unitId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .select('client.id', 'client_id')
      .addSelect('client.name', 'client_name')
      .addSelect('COUNT(order.id)', 'order_count')
      .addSelect('SUM(order.total_amount)', 'total_spent')
      .addSelect('MAX(order.order_date)', 'last_order_at')
      .groupBy('client.id')
      .addGroupBy('client.name')
      .orderBy('total_spent', 'DESC')
      .limit(query.limit ?? DEFAULT_LIMIT)
      .getRawMany<{
        client_id: number;
        client_name: string;
        order_count: string;
        total_spent: string;
        last_order_at: Date;
      }>();

    return rows.map((r) => ({
      client_id: r.client_id,
      client_name: r.client_name,
      order_count: Number(r.order_count),
      total_spent: Number(r.total_spent),
      last_order_at: r.last_order_at,
    }));
  }
}
