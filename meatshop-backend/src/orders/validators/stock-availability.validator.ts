import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../products/entities/stock.entity';

interface StockCheckItem {
  product_id: number;
  product_name: string;
  quantity: number;
}

@Injectable()
export class StockAvailabilityValidator {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async assertAvailable(items: StockCheckItem[]): Promise<void> {
    const insufficient: string[] = [];

    for (const item of items) {
      const stock = await this.stockRepository.findOne({
        where: { product_id: item.product_id },
      });

      if (!stock || stock.quantity < item.quantity) {
        insufficient.push(item.product_name);
      }
    }

    if (insufficient.length > 0) {
      throw new BadRequestException(
        `Insufficient stock for: ${insufficient.join(', ')}`,
      );
    }
  }
}
