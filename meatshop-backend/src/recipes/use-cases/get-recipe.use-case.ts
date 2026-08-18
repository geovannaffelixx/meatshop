import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipeDetailResponseDto } from '../dtos/recipe-response.dto';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { RecipeProduct } from '../entities/recipe-product.entity';
import { RecipeStep } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';

@Injectable()
export class GetRecipeUseCase {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeStep)
    private readonly recipeStepRepository: Repository<RecipeStep>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    @InjectRepository(RecipeProduct)
    private readonly recipeProductRepository: Repository<RecipeProduct>,
  ) {}

  async execute(recipeId: number): Promise<RecipeDetailResponseDto> {
    const recipe = await this.recipeRepository.findOne({ where: { id: recipeId } });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return this.assemble(recipe);
  }

  async assemble(recipe: Recipe): Promise<RecipeDetailResponseDto> {
    const [steps, ingredients, products] = await Promise.all([
      this.recipeStepRepository.find({ where: { recipe_id: recipe.id } }),
      this.recipeIngredientRepository.find({ where: { recipe_id: recipe.id } }),
      this.recipeProductRepository.find({
        where: { recipe_id: recipe.id },
        relations: ['product'],
      }),
    ]);

    return RecipeDetailResponseDto.fromEntities(recipe, steps, ingredients, products);
  }
}
