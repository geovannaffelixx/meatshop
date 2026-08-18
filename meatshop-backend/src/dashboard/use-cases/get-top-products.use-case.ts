import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { RankedListQueryDto } from '../dtos/ranked-list-query.dto';

export type TopProductItem = {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
};

const DEFAULT_LIMIT = 10;

@Injectable()
export class GetTopProductsUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: RankedListQueryDto, currentUser: User): Promise<TopProductItem[]> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );
    return this.forUnit(unitId, query.limit ?? DEFAULT_LIMIT);
  }

  async forUnit(unitId: number, limit: number): Promise<TopProductItem[]> {
    const rows = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .where('order.unit_id = :unitId', { unitId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .select('product.id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('SUM(item.quantity)', 'quantity_sold')
      .addSelect('SUM(item.quantity * item.unit_price)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('quantity_sold', 'DESC')
      .limit(limit)
      .getRawMany<{
        product_id: number;
        product_name: string;
        quantity_sold: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      quantity_sold: Number(r.quantity_sold),
      revenue: Number(r.revenue),
    }));
  }
}
