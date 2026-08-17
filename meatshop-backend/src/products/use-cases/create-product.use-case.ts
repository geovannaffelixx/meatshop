import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);
    await this.ensureCategoryBelongsToUnit(dto.category_id, dto.unit_id);

    const product = this.productRepository.create(dto);
    await this.productRepository.save(product);

    await this.stockRepository.save(
      this.stockRepository.create({ product_id: product.id, quantity: 0 }),
    );

    this.logger.log(`Product ${product.id} created by user ${currentUser.id}`);

    return product;
  }

  private async ensureCategoryBelongsToUnit(
    categoryId: number,
    unitId: number,
  ): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category || category.unit_id !== unitId) {
      throw new NotFoundException('Category not found for this unit');
    }
  }
}
