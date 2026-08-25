import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateStockDto } from '../dtos/update-stock.dto';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class UpdateStockUseCase {
  private readonly logger = new Logger(UpdateStockUseCase.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(productId: number, dto: UpdateStockDto, currentUser: User): Promise<Stock> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const unit = await this.unitRepository.findOne({
      where: { id: product.unit_id },
    });
    await this.unitAuthorizationService.assertHasPermission(
      currentUser, product.unit_id, UnitPermission.MANAGE_PRODUCTS,
    );

    const stock = await this.stockRepository.findOne({
      where: { product_id: productId },
    });
    if (!stock) {
      throw new NotFoundException('Stock not found for this product');
    }

    stock.quantity = dto.quantity;
    if (dto.min_quantity !== undefined) {
      stock.min_quantity = dto.min_quantity;
    }
    await this.stockRepository.save(stock);

    this.logger.log(
      `Stock for product ${productId} updated to ${dto.quantity} by user ${currentUser.id}`,
    );

    return stock;
  }
}
