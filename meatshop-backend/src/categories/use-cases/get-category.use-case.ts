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

  async execute(categoryId: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
