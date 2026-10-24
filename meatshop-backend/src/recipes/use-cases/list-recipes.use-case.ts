import { paginatedResult, searchPattern } from '../../common/dtos/panel-list-query.dto';
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

  async execute(filters: FilterRecipesDto) {
    if (filters.paginated === 'true') {
      const query = this.recipeRepository.createQueryBuilder('recipe');
      if (filters.unit_id) query.andWhere('recipe.unit_id = :unitId', { unitId: filters.unit_id });
      if (filters.tag) query.andWhere('recipe.tag = :tag', { tag: filters.tag });
      if (filters.active !== undefined)
        query.andWhere('recipe.active = :active', { active: filters.active === 'true' });
      if (filters.current_week === 'true')
        query.andWhere('recipe.week_start <= :now', { now: new Date() });
      if (filters.search?.trim())
        query.andWhere('(recipe.title ILIKE :search OR recipe.tag ILIKE :search)', {
          search: searchPattern(filters.search),
        });
      const [data, total] = await query
        .orderBy('recipe.display_order', 'ASC')
        .addOrderBy('recipe.id', 'ASC')
        .skip((filters.page - 1) * filters.limit)
        .take(filters.limit)
        .getManyAndCount();
      return paginatedResult(
        data.map((recipe) => RecipeSummaryResponseDto.fromEntity(recipe)),
        total,
        filters,
      );
    }
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
