import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateRecipeDto } from '../dtos/update-recipe.dto';
import { RecipeDetailResponseDto } from '../dtos/recipe-response.dto';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { RecipeProduct } from '../entities/recipe-product.entity';
import { RecipeStep } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';
import { GetRecipeUseCase } from './get-recipe.use-case';

@Injectable()
export class UpdateRecipeUseCase {
  private readonly logger = new Logger(UpdateRecipeUseCase.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeStep)
    private readonly recipeStepRepository: Repository<RecipeStep>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    @InjectRepository(RecipeProduct)
    private readonly recipeProductRepository: Repository<RecipeProduct>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly getRecipeUseCase: GetRecipeUseCase,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    recipeId: number,
    dto: UpdateRecipeDto,
    currentUser: User,
  ): Promise<RecipeDetailResponseDto> {
    const recipe = await this.recipeRepository.findOne({ where: { id: recipeId } });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const unit = await this.unitRepository.findOne({ where: { id: recipe.unit_id } });
    await this.unitAuthorizationService.assertHasPermission(
      currentUser, recipe.unit_id, UnitPermission.MANAGE_PRODUCTS,
    );

    if (dto.products?.length) {
      await this.assertProductsBelongToUnit(
        dto.products.map((p) => p.product_id),
        recipe.unit_id,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await this.applyScalarUpdates(manager, recipe, dto);
      await this.replaceSteps(manager, recipeId, dto);
      await this.replaceIngredients(manager, recipeId, dto);
      await this.replaceProducts(manager, recipeId, dto);
    });

    this.logger.log(`Recipe ${recipeId} updated by user ${currentUser.id}`);

    return this.getRecipeUseCase.execute(recipeId);
  }

  private async applyScalarUpdates(
    manager: EntityManager,
    recipe: Recipe,
    dto: UpdateRecipeDto,
  ): Promise<void> {
    const { steps, ingredients, products, week_start: weekStart, ...scalars } = dto;
    void steps;
    void ingredients;
    void products;
    Object.assign(recipe, scalars);
    if (weekStart !== undefined) {
      recipe.week_start = weekStart ? new Date(weekStart) : null;
    }
    await manager.save(Recipe, recipe);
  }

  private async replaceSteps(
    manager: EntityManager,
    recipeId: number,
    dto: UpdateRecipeDto,
  ): Promise<void> {
    if (!dto.steps) return;
    await manager.delete(RecipeStep, { recipe_id: recipeId });
    const steps = dto.steps.map((step) =>
      manager.create(RecipeStep, { ...step, recipe_id: recipeId }),
    );
    await manager.save(RecipeStep, steps);
  }

  private async replaceIngredients(
    manager: EntityManager,
    recipeId: number,
    dto: UpdateRecipeDto,
  ): Promise<void> {
    if (!dto.ingredients) return;
    await manager.delete(RecipeIngredient, { recipe_id: recipeId });
    const ingredients = dto.ingredients.map((ingredient) =>
      manager.create(RecipeIngredient, { ...ingredient, recipe_id: recipeId }),
    );
    await manager.save(RecipeIngredient, ingredients);
  }

  private async replaceProducts(
    manager: EntityManager,
    recipeId: number,
    dto: UpdateRecipeDto,
  ): Promise<void> {
    if (!dto.products) return;
    await manager.delete(RecipeProduct, { recipe_id: recipeId });
    const products = dto.products.map((product) =>
      manager.create(RecipeProduct, { ...product, recipe_id: recipeId }),
    );
    await manager.save(RecipeProduct, products);
  }

  private async assertProductsBelongToUnit(productIds: number[], unitId: number): Promise<void> {
    const products = await this.productRepository.find({ where: { id: In(productIds) } });

    if (products.length !== productIds.length || products.some((p) => p.unit_id !== unitId)) {
      throw new BadRequestException('All featured products must belong to the recipe unit');
    }
  }
}
