import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(
    productId: number,
    dto: UpdateProductDto,
    currentUser: User,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const unit = await this.unitRepository.findOne({
      where: { id: product.unit_id },
    });
    this.unitAuthorizationService.assertCanManageUnit(unit!, currentUser);

    if (dto.category_id) {
      await this.ensureCategoryBelongsToUnit(dto.category_id, product.unit_id);
    }

    Object.assign(product, dto);
    await this.productRepository.save(product);

    this.logger.log(`Product ${product.id} updated by user ${currentUser.id}`);

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
