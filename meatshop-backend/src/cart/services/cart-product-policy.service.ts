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
    if (!product || !product.active || !product.category?.active) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_AVAILABLE',
        message: 'Produto indisponível para compra.',
      });
    }
    const stock = await this.stocks.findOne({
      where: { product_id: productId },
    });
    const available = Number(stock?.quantity ?? 0);
    if (desiredQuantity > available) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Estoque insuficiente para a quantidade solicitada.',
        details: [{ product_id: productId, available }],
      });
    }
    return product;
  }
}
