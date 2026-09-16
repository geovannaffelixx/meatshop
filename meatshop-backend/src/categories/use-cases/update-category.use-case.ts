import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
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
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(categoryId: number, dto: UpdateCategoryDto, currentUser: User): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      category.unit_id,
      UnitPermission.MANAGE_CATEGORIES,
    );

    Object.assign(category, dto);
    await this.categoryRepository.save(category);

    this.logger.log(`Category ${category.id} updated by user ${currentUser.id}`);

    return category;
  }
}
