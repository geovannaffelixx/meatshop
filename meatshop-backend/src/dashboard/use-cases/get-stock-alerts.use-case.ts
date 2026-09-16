import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../products/entities/stock.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UnitScopedQueryDto } from '../dtos/unit-scoped-query.dto';

export type StockAlertItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  min_quantity: number;
};

@Injectable()
export class GetStockAlertsUseCase {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: UnitScopedQueryDto, currentUser: User): Promise<StockAlertItem[]> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );
    return this.forUnit(unitId);
  }

  async forUnit(unitId: number): Promise<StockAlertItem[]> {
    const rows = await this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .where('product.unit_id = :unitId', { unitId })
      .andWhere('stock.quantity <= stock.min_quantity')
      .select([
        'product.id AS product_id',
        'product.name AS product_name',
        'stock.quantity AS quantity',
        'stock.min_quantity AS min_quantity',
      ])
      .orderBy('stock.quantity', 'ASC')
      .getRawMany<{
        product_id: number;
        product_name: string;
        quantity: number;
        min_quantity: number;
      }>();

    return rows.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      quantity: Number(r.quantity),
      min_quantity: Number(r.min_quantity),
    }));
  }
}
