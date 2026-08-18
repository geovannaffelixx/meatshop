import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { UnitsModule } from '../units/units.module';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeProduct } from './entities/recipe-product.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipesController } from './recipes.controller';
import { CreateRecipeUseCase } from './use-cases/create-recipe.use-case';
import { DeleteRecipeUseCase } from './use-cases/delete-recipe.use-case';
import { GetRecipeUseCase } from './use-cases/get-recipe.use-case';
import { ListRecipesUseCase } from './use-cases/list-recipes.use-case';
import { UpdateRecipeUseCase } from './use-cases/update-recipe.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeStep, RecipeIngredient, RecipeProduct]),
    UnitsModule,
    ProductsModule,
  ],
  controllers: [RecipesController],
  providers: [
    GetRecipeUseCase,
    CreateRecipeUseCase,
    UpdateRecipeUseCase,
    DeleteRecipeUseCase,
    ListRecipesUseCase,
  ],
})
export class RecipesModule {}
