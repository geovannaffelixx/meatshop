import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
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
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(productId: number, dto: UpdateStockDto, currentUser: User): Promise<Stock> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      product.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    if (dto.quantity === undefined && dto.min_quantity === undefined) {
      throw new BadRequestException('Informe a quantidade ou o estoque mínimo.');
    }
    return this.stockRepository.manager.transaction(async (manager) => {
      const stock = await manager.findOne(Stock, {
        where: { product_id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stock) {
        throw new NotFoundException('Stock not found for this product');
      }

      if (dto.quantity !== undefined) {
        if (
          dto.expected_quantity !== undefined &&
          Number(stock.quantity) !== dto.expected_quantity
        ) {
          throw new ConflictException({
            code: 'STOCK_CHANGED',
            message:
              'O estoque mudou desde que você abriu a tela. Atualize os dados antes de ajustar a quantidade.',
          });
        }
        stock.quantity = dto.quantity;
      }
      if (dto.min_quantity !== undefined) {
        stock.min_quantity = dto.min_quantity;
      }
      await manager.save(Stock, stock);

      this.logger.log(
        `Stock for product ${productId} updated to ${stock.quantity} by user ${currentUser.id}`,
      );

      return stock;
    });
  }
}
