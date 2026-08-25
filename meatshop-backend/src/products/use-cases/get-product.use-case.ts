import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class GetProductUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
  ) {}

  async execute(
    productId: number,
  ): Promise<{ product: Product; stock: Stock | null; images: ProductImage[] }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stock = await this.stockRepository.findOne({
      where: { product_id: productId },
    });

    const images = await this.productImageRepository.find({
      where: { product_id: productId },
      order: { id: 'ASC' },
    });

    return { product, stock, images };
  }
}
