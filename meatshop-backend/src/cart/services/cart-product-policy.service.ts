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
    const [product] = await this.products.find({
      where: { id: productId },
      relations: ['category', 'unit'],
    });
    this.assertProduct(product, desiredQuantity);
    const stock = await this.stocks.findOne({ where: { product_id: productId } });
    return this.validateLoaded(product, Number(stock?.quantity ?? 0), desiredQuantity);
  }

  validateLoaded(product: Product, available: number, desiredQuantity: number): Product {
    this.assertProduct(product, desiredQuantity);
    if (!hasSufficientStock(available, desiredQuantity)) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock for the requested quantity.',
        details: [{ product_id: product.id, available }],
      });
    }
    return product;
  }

  private assertProduct(
    product: Product | undefined,
    desiredQuantity: number,
  ): asserts product is Product {
    if (!product || !isPurchasableProduct(product)) {
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
  }
}
