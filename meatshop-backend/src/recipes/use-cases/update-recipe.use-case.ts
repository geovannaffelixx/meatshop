import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    this.unitAuthorizationService.assertCanManageUnit(unit!, currentUser);

    if (dto.products?.length) {
      await this.assertProductsBelongToUnit(dto.products.map((p) => p.product_id), recipe.unit_id);
    }

    await this.applyScalarUpdates(recipe, dto);
    await this.replaceSteps(recipeId, dto);
    await this.replaceIngredients(recipeId, dto);
    await this.replaceProducts(recipeId, dto);

    this.logger.log(`Recipe ${recipeId} updated by user ${currentUser.id}`);

    return this.getRecipeUseCase.execute(recipeId);
  }

  private async applyScalarUpdates(recipe: Recipe, dto: UpdateRecipeDto): Promise<void> {
    const { steps, ingredients, products, week_start, ...scalars } = dto;
    Object.assign(recipe, scalars);
    if (week_start !== undefined) {
      recipe.week_start = week_start ? new Date(week_start) : null;
    }
    await this.recipeRepository.save(recipe);
  }

  private async replaceSteps(recipeId: number, dto: UpdateRecipeDto): Promise<void> {
    if (!dto.steps) return;
    await this.recipeStepRepository.delete({ recipe_id: recipeId });
    const steps = dto.steps.map((step) =>
      this.recipeStepRepository.create({ ...step, recipe_id: recipeId }),
    );
    await this.recipeStepRepository.save(steps);
  }

  private async replaceIngredients(recipeId: number, dto: UpdateRecipeDto): Promise<void> {
    if (!dto.ingredients) return;
    await this.recipeIngredientRepository.delete({ recipe_id: recipeId });
    const ingredients = dto.ingredients.map((ingredient) =>
      this.recipeIngredientRepository.create({ ...ingredient, recipe_id: recipeId }),
    );
    await this.recipeIngredientRepository.save(ingredients);
  }

  private async replaceProducts(recipeId: number, dto: UpdateRecipeDto): Promise<void> {
    if (!dto.products) return;
    await this.recipeProductRepository.delete({ recipe_id: recipeId });
    const products = dto.products.map((product) =>
      this.recipeProductRepository.create({ ...product, recipe_id: recipeId }),
    );
    await this.recipeProductRepository.save(products);
  }

  private async assertProductsBelongToUnit(productIds: number[], unitId: number): Promise<void> {
    const products = await this.productRepository.find({ where: { id: In(productIds) } });

    if (products.length !== productIds.length || products.some((p) => p.unit_id !== unitId)) {
      throw new BadRequestException('All featured products must belong to the recipe unit');
    }
  }
}
