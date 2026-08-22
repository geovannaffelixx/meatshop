import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { Category } from '../entities/category.entity';

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(dto: CreateCategoryDto, currentUser: User): Promise<Category> {
    const unit = await this.unitRepository.findOne({
      where: { id: dto.unit_id },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser, unit.id, UnitPermission.MANAGE_CATEGORIES,
    );

    const category = this.categoryRepository.create(dto);
    await this.categoryRepository.save(category);

    this.logger.log(`Category ${category.id} created by user ${currentUser.id}`);

    return category;
  }
}
