import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Recipe } from '../entities/recipe.entity';

@Injectable()
export class DeleteRecipeUseCase {
  private readonly logger = new Logger(DeleteRecipeUseCase.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(recipeId: number, currentUser: User): Promise<void> {
    const recipe = await this.recipeRepository.findOne({ where: { id: recipeId } });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const unit = await this.unitRepository.findOne({ where: { id: recipe.unit_id } });
    await this.unitAuthorizationService.assertHasPermission(
      currentUser, recipe.unit_id, UnitPermission.MANAGE_PRODUCTS,
    );

    await this.recipeRepository.remove(recipe);

    this.logger.log(`Recipe ${recipeId} deleted by user ${currentUser.id}`);
  }
}
