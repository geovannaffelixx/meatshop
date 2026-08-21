import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UnitScopedQueryDto } from '../dtos/unit-scoped-query.dto';

export type DeliveryPerformanceResult = {
  averageDeliveryMinutes: number | null;
  cancellationRate: number;
  deliveredCount: number;
  cancelledCount: number;
  totalCount: number;
  byDeliveryPerson: {
    delivery_person_id: number;
    delivery_person_name: string;
    deliveries: number;
  }[];
};

@Injectable()
export class GetDeliveryPerformanceUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: UnitScopedQueryDto, currentUser: User): Promise<DeliveryPerformanceResult> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );

    const [averageDeliveryMinutes, counts, byDeliveryPerson] = await Promise.all([
      this.getAverageDeliveryMinutes(unitId),
      this.getStatusCounts(unitId),
      this.getDeliveriesByPerson(unitId),
    ]);

    const cancellationRate = counts.totalCount > 0 ? counts.cancelledCount / counts.totalCount : 0;

    return { averageDeliveryMinutes, cancellationRate, ...counts, byDeliveryPerson };
  }

  private async getAverageDeliveryMinutes(unitId: number): Promise<number | null> {
    const row = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin(
        'order_status_history',
        'osh',
        'osh.order_id = order.id AND osh.status = :delivered',
        { delivered: OrderStatus.DELIVERED },
      )
      .where('order.unit_id = :unitId', { unitId })
      .select('AVG(EXTRACT(EPOCH FROM (osh.created_at - order.order_date)) / 60)', 'avg_minutes')
      .getRawOne<{ avg_minutes: string | null }>();

    return row?.avg_minutes ? Number(row.avg_minutes) : null;
  }

  private async getStatusCounts(
    unitId: number,
  ): Promise<{ deliveredCount: number; cancelledCount: number; totalCount: number }> {
    const [deliveredCount, cancelledCount, totalCount] = await Promise.all([
      this.orderRepository.count({ where: { unit_id: unitId, status: OrderStatus.DELIVERED } }),
      this.orderRepository.count({ where: { unit_id: unitId, status: OrderStatus.CANCELLED } }),
      this.orderRepository.count({ where: { unit_id: unitId } }),
    ]);
    return { deliveredCount, cancelledCount, totalCount };
  }

  private async getDeliveriesByPerson(
    unitId: number,
  ): Promise<{ delivery_person_id: number; delivery_person_name: string; deliveries: number }[]> {
    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.delivery_person', 'dp')
      .innerJoin('dp.user', 'deliveryUser')
      .where('order.unit_id = :unitId', { unitId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .select('dp.id', 'delivery_person_id')
      .addSelect('deliveryUser.name', 'delivery_person_name')
      .addSelect('COUNT(order.id)', 'deliveries')
      .groupBy('dp.id')
      .addGroupBy('deliveryUser.name')
      .orderBy('deliveries', 'DESC')
      .getRawMany<{
        delivery_person_id: number;
        delivery_person_name: string;
        deliveries: string;
      }>();

    return rows.map((r) => ({
      delivery_person_id: r.delivery_person_id,
      delivery_person_name: r.delivery_person_name,
      deliveries: Number(r.deliveries),
    }));
  }
}
