import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { FilterRecipesDto } from '../dtos/filter-recipes.dto';
import { RecipeSummaryResponseDto } from '../dtos/recipe-response.dto';
import { Recipe } from '../entities/recipe.entity';

@Injectable()
export class ListRecipesUseCase {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
  ) {}

  async execute(filters: FilterRecipesDto): Promise<RecipeSummaryResponseDto[]> {
    const where: Record<string, unknown> = {};
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.tag) where.tag = filters.tag;
    if (filters.active !== undefined) where.active = filters.active === 'true';

    const isCurrentWeek = filters.current_week === 'true';
    if (isCurrentWeek) where.week_start = LessThanOrEqual(new Date());

    const recipes = await this.recipeRepository.find({
      where,
      order: isCurrentWeek ? { week_start: 'DESC' } : { display_order: 'ASC', id: 'ASC' },
    });

    return recipes.map((recipe) => RecipeSummaryResponseDto.fromEntity(recipe));
  }
}
