/* global jest */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CategoriesController } from '../../categories/categories.controller';
import { RecipesController } from '../../recipes/recipes.controller';
import { GetCategoryUseCase } from '../../categories/use-cases/get-category.use-case';
import { GetRecipeUseCase } from '../../recipes/use-cases/get-recipe.use-case';
import { FilterCategoriesDto } from '../../categories/dtos/filter-categories.dto';
import { FilterRecipesDto } from '../../recipes/dtos/filter-recipes.dto';

describe('Public catalog versus protected management', () => {
  const denied = { assertHasPermission: jest.fn().mockRejectedValue(new ForbiddenException()) };
  it('forces active categories even when an anonymous caller requests inactive ones', async () => {
    const list = { execute: jest.fn() };
    const controller = new CategoriesController(
      {} as never,
      {} as never,
      list as never,
      {} as never,
      denied as never,
    );
    const filters = Object.assign(new FilterCategoriesDto(), { unit_id: 1, active: 'false' });
    await controller.list(filters);
    expect(list.execute).toHaveBeenCalledWith(1, true, filters, true);
  });
  it('does not read administrative categories before unit permission is checked', async () => {
    const list = { execute: jest.fn() };
    const controller = new CategoriesController(
      {} as never,
      {} as never,
      list as never,
      {} as never,
      denied as never,
    );
    await expect(
      controller.manage(Object.assign(new FilterCategoriesDto(), { unit_id: 2 }), {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(list.execute).not.toHaveBeenCalled();
  });
  it('forces active recipes even when an anonymous caller requests drafts', async () => {
    const list = { execute: jest.fn() };
    const controller = new RecipesController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      list as never,
      denied as never,
    );
    await controller.list(Object.assign(new FilterRecipesDto(), { active: 'false' }));
    expect(list.execute).toHaveBeenCalledWith(expect.objectContaining({ active: 'true' }), true);
  });
  it('denies administrative recipes belonging to another unit', async () => {
    const list = { execute: jest.fn() };
    const controller = new RecipesController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      list as never,
      denied as never,
    );
    await expect(
      controller.manage(Object.assign(new FilterRecipesDto(), { unit_id: 2 }), {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(list.execute).not.toHaveBeenCalled();
  });
  it('does not return inactive categories or units from the public detail route', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(
      new GetCategoryUseCase(repository as never).execute(1, true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1, active: true, unit: { is_active: true } },
    });
  });
  it('does not return inactive recipes or units from the public detail route', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(
      new GetRecipeUseCase(repository as never, {} as never, {} as never, {} as never).execute(
        1,
        true,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1, active: true, unit: { is_active: true } },
    });
  });
});
