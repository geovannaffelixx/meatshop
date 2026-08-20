import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { CreateRecipeDto } from '../dtos/create-recipe.dto';
import { RecipeDetailResponseDto } from '../dtos/recipe-response.dto';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { RecipeProduct } from '../entities/recipe-product.entity';
import { RecipeStep } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';
import { GetRecipeUseCase } from './get-recipe.use-case';

@Injectable()
export class CreateRecipeUseCase {
  private readonly logger = new Logger(CreateRecipeUseCase.name);

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

  async execute(dto: CreateRecipeDto, currentUser: User): Promise<RecipeDetailResponseDto> {
    const unit = await this.unitRepository.findOne({ where: { id: dto.unit_id } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    if (dto.products?.length) {
      await this.assertProductsBelongToUnit(
        dto.products.map((p) => p.product_id),
        dto.unit_id,
      );
    }

    const recipe = await this.persistRecipe(dto);
    await Promise.all([
      this.persistSteps(recipe.id, dto),
      this.persistIngredients(recipe.id, dto),
      this.persistProducts(recipe.id, dto),
    ]);

    this.logger.log(`Recipe ${recipe.id} created by user ${currentUser.id}`);

    return this.getRecipeUseCase.execute(recipe.id);
  }

  private async persistRecipe(dto: CreateRecipeDto): Promise<Recipe> {
    const recipe = this.recipeRepository.create({
      unit_id: dto.unit_id,
      title: dto.title,
      description: dto.description,
      image_url: dto.image_url ?? null,
      video_url: dto.video_url ?? null,
      tag: dto.tag ?? null,
      active: dto.active ?? true,
      display_order: dto.display_order ?? 0,
      week_start: dto.week_start ? new Date(dto.week_start) : null,
    });
    return this.recipeRepository.save(recipe);
  }

  private async persistSteps(recipeId: number, dto: CreateRecipeDto): Promise<void> {
    const steps = dto.steps.map((step) =>
      this.recipeStepRepository.create({ ...step, recipe_id: recipeId }),
    );
    await this.recipeStepRepository.save(steps);
  }

  private async persistIngredients(recipeId: number, dto: CreateRecipeDto): Promise<void> {
    const ingredients = dto.ingredients.map((ingredient) =>
      this.recipeIngredientRepository.create({ ...ingredient, recipe_id: recipeId }),
    );
    await this.recipeIngredientRepository.save(ingredients);
  }

  private async persistProducts(recipeId: number, dto: CreateRecipeDto): Promise<void> {
    if (!dto.products?.length) return;

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
