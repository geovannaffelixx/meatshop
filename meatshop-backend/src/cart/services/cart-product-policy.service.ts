import {
  isPurchasableProduct,
  isValidProductQuantity,
  hasSufficientStock,
} from './product-availability.policy';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../products/entities/stock.entity';

@Injectable()
export class CartProductPolicyService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stocks: Repository<Stock>,
  ) {}

  async validate(productId: number, desiredQuantity: number): Promise<Product> {
    const product = await this.products.findOne({
      where: { id: productId },
      relations: ['category', 'unit'],
    });
    if (!isPurchasableProduct(product)) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_AVAILABLE',
        message: 'Product is unavailable for purchase.',
      });
    }
    if (!isValidProductQuantity(product, desiredQuantity)) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_QUANTITY',
        message: 'Informe uma quantidade válida para a unidade de medida do produto.',
      });
    }
    const stock = await this.stocks.findOne({
      where: { product_id: productId },
    });
    const available = Number(stock?.quantity ?? 0);
    if (!hasSufficientStock(available, desiredQuantity)) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock for the requested quantity.',
        details: [{ product_id: productId, available }],
      });
    }
    return product;
  }
}
