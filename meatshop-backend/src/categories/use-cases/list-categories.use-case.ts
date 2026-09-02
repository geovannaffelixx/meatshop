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

  async execute(unitId?: number, active?: boolean): Promise<Category[]> {
    const where: Record<string, unknown> = {};
    if (unitId) where.unit_id = unitId;
    if (active !== undefined) where.active = active;
    return this.categoryRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }
}
