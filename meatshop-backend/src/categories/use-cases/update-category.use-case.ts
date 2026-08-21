import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { Category } from '../entities/category.entity';

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(
    categoryId: number,
    dto: UpdateCategoryDto,
    currentUser: User,
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const unit = await this.unitRepository.findOne({
      where: { id: category.unit_id },
    });
    this.unitAuthorizationService.assertCanManageUnit(unit!, currentUser);

    Object.assign(category, dto);
    await this.categoryRepository.save(category);

    this.logger.log(`Category ${category.id} updated by user ${currentUser.id}`);

    return category;
  }
}
