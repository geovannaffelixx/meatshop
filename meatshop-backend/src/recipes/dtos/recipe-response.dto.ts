import type { Recipe } from '../entities/recipe.entity';
import type { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import type { RecipeProduct } from '../entities/recipe-product.entity';
import type { RecipeStep } from '../entities/recipe-step.entity';

export class RecipeStepResponseDto {
  id: number;
  step_number: number;
  description: string;
  tip: string | null;

  static fromEntity(step: RecipeStep): RecipeStepResponseDto {
    const dto = new RecipeStepResponseDto();
    dto.id = step.id;
    dto.step_number = step.step_number;
    dto.description = step.description;
    dto.tip = step.tip;
    return dto;
  }
}

export class RecipeIngredientResponseDto {
  id: number;
  name: string;
  quantity: string;
  tip: string | null;

  static fromEntity(ingredient: RecipeIngredient): RecipeIngredientResponseDto {
    const dto = new RecipeIngredientResponseDto();
    dto.id = ingredient.id;
    dto.name = ingredient.name;
    dto.quantity = ingredient.quantity;
    dto.tip = ingredient.tip;
    return dto;
  }
}

export class RecipeProductResponseDto {
  id: number;
  product_id: number;
  call_to_action: string;
  product_name: string;
  product_price: number;
  product_image_url: string | null;

  static fromEntity(recipeProduct: RecipeProduct): RecipeProductResponseDto {
    const dto = new RecipeProductResponseDto();
    dto.id = recipeProduct.id;
    dto.product_id = recipeProduct.product_id;
    dto.call_to_action = recipeProduct.call_to_action;
    dto.product_name = recipeProduct.product?.name;
    dto.product_price = Number(recipeProduct.product?.price);
    dto.product_image_url = recipeProduct.product?.image_url ?? null;
    return dto;
  }
}

export class RecipeSummaryResponseDto {
  id: number;
  unit_id: number;
  title: string;
  image_url: string | null;
  tag: string | null;
  active: boolean;
  display_order: number;
  week_start: Date | null;

  static fromEntity(recipe: Recipe): RecipeSummaryResponseDto {
    const dto = new RecipeSummaryResponseDto();
    dto.id = recipe.id;
    dto.unit_id = recipe.unit_id;
    dto.title = recipe.title;
    dto.image_url = recipe.image_url;
    dto.tag = recipe.tag;
    dto.active = recipe.active;
    dto.display_order = recipe.display_order;
    dto.week_start = recipe.week_start;
    return dto;
  }
}

export class RecipeDetailResponseDto extends RecipeSummaryResponseDto {
  description: string;
  video_url: string | null;
  created_at: Date;
  steps: RecipeStepResponseDto[];
  ingredients: RecipeIngredientResponseDto[];
  products: RecipeProductResponseDto[];

  static fromEntities(
    recipe: Recipe,
    steps: RecipeStep[],
    ingredients: RecipeIngredient[],
    products: RecipeProduct[],
  ): RecipeDetailResponseDto {
    const dto = new RecipeDetailResponseDto();
    Object.assign(dto, RecipeSummaryResponseDto.fromEntity(recipe));
    dto.description = recipe.description;
    dto.video_url = recipe.video_url;
    dto.created_at = recipe.created_at;
    dto.steps = steps
      .sort((a, b) => a.step_number - b.step_number)
      .map((step) => RecipeStepResponseDto.fromEntity(step));
    dto.ingredients = ingredients.map((i) => RecipeIngredientResponseDto.fromEntity(i));
    dto.products = products.map((p) => RecipeProductResponseDto.fromEntity(p));
    return dto;
  }
}
