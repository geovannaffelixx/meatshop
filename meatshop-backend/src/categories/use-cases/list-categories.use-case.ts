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

  async execute(unitId?: number): Promise<Category[]> {
    return this.categoryRepository.find({
      where: unitId ? { unit_id: unitId } : {},
      order: { id: 'ASC' },
    });
  }
}
