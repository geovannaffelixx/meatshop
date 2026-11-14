import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { CreateProductDto } from '../dtos/create-product.dto';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(dto: CreateProductDto, currentUser: User): Promise<Product> {
    const unit = await this.unitRepository.findOne({
      where: { id: dto.unit_id },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unit.id,
      UnitPermission.MANAGE_PRODUCTS,
    );
    await this.ensureCategoryBelongsToUnit(dto.category_id, dto.unit_id);

    return this.productRepository.manager.transaction(async (manager) => {
      const { initial_quantity: initialQuantity, min_quantity: minQuantity, ...fields } = dto;
      const product = manager.create(Product, {
        ...fields,
        description: dto.description?.trim() || null,
      });
      const savedProduct = await manager.save(Product, product);

      await manager.save(
        Stock,
        manager.create(Stock, {
          product_id: savedProduct.id,
          quantity: initialQuantity ?? 0,
          min_quantity: minQuantity ?? 0,
        }),
      );

      this.logger.log(`Product ${savedProduct.id} created by user ${currentUser.id}`);

      return savedProduct;
    });
  }

  private async ensureCategoryBelongsToUnit(categoryId: number, unitId: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category || category.unit_id !== unitId) {
      throw new NotFoundException('Category not found for this unit');
    }
  }
}
