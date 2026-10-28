import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { FilterRecipesDto } from './dtos/filter-recipes.dto';
import { UpdateRecipeDto } from './dtos/update-recipe.dto';
import { CreateRecipeUseCase } from './use-cases/create-recipe.use-case';
import { DeleteRecipeUseCase } from './use-cases/delete-recipe.use-case';
import { GetRecipeUseCase } from './use-cases/get-recipe.use-case';
import { ListRecipesUseCase } from './use-cases/list-recipes.use-case';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { UpdateRecipeUseCase } from './use-cases/update-recipe.use-case';

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly createRecipeUseCase: CreateRecipeUseCase,
    private readonly updateRecipeUseCase: UpdateRecipeUseCase,
    private readonly deleteRecipeUseCase: DeleteRecipeUseCase,
    private readonly getRecipeUseCase: GetRecipeUseCase,
    private readonly listRecipesUseCase: ListRecipesUseCase,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  @Public()
  @ApiOperation({
    summary: 'Lists recipe summaries with unit, tag, status, and recipe-of-the-week filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe list returned successfully',
  })
  @Get()
  list(@Query() filters: FilterRecipesDto) {
    return this.listRecipesUseCase.execute({ ...filters, active: 'true' }, true);
  }

  @Get('manage')
  async manage(@Query() filters: FilterRecipesDto, @CurrentUser() user: User) {
    if (!filters.unit_id) throw new BadRequestException('Choose a unit');
    await this.authorization.assertHasPermission(
      user,
      filters.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );
    return this.listRecipesUseCase.execute(filters);
  }

  @Get('manage/:id')
  async manageOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const recipe = await this.getRecipeUseCase.execute(id);
    await this.authorization.assertHasPermission(
      user,
      recipe.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );
    return recipe;
  }

  @Public()
  @ApiOperation({
    summary: 'Gets a complete recipe with steps, ingredients, and featured products',
  })
  @ApiResponse({ status: 200, description: 'Recipe found successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getRecipeUseCase.execute(id, true);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Creates a recipe with steps, ingredients, and featured products',
  })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Product em destaque does not belong to the unit',
  })
  @ApiResponse({ status: 403, description: 'User is not a unit administrator' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Post()
  create(@Body() dto: CreateRecipeDto, @CurrentUser() currentUser: User) {
    return this.createRecipeUseCase.execute(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Updates a recipe. Provided steps, ingredients, or products replace existing values',
  })
  @ApiResponse({ status: 200, description: 'Recipe updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Product em destaque does not belong to the unit',
  })
  @ApiResponse({ status: 403, description: 'User is not a unit administrator' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateRecipeUseCase.execute(id, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Permanently deletes a recipe' })
  @ApiResponse({ status: 204, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 403, description: 'User is not a unit administrator' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deleteRecipeUseCase.execute(id, currentUser);
  }
}
