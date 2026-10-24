import {
  PanelListQueryDto,
  paginatedResult,
  searchPattern,
} from '../../common/dtos/panel-list-query.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async execute(unitId?: number, active?: boolean, filters?: PanelListQueryDto) {
    if (filters?.paginated === 'true') {
      const query = this.categoryRepository.createQueryBuilder('category');
      if (unitId) query.andWhere('category.unit_id = :unitId', { unitId });
      if (active !== undefined) query.andWhere('category.active = :active', { active });
      if (filters.search?.trim())
        query.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', {
          search: searchPattern(filters.search),
        });
      const [data, total] = await query
        .orderBy('category.id', 'ASC')
        .skip((filters.page - 1) * filters.limit)
        .take(filters.limit)
        .getManyAndCount();
      return paginatedResult(data, total, filters);
    }
    const where: Record<string, unknown> = {};
    if (unitId) where.unit_id = unitId;
    if (active !== undefined) where.active = active;
    return this.categoryRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }
}
