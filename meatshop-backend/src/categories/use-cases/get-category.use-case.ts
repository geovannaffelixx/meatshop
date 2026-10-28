import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class GetCategoryUseCase {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async execute(categoryId: number, publicOnly = false): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, ...(publicOnly ? { active: true, unit: { is_active: true } } : {}) },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
