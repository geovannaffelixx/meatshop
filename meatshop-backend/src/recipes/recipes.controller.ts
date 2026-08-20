import {
  Body,
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
  ) {}

  @Public()
  @ApiOperation({
    summary: 'Lista receitas (resumo), com filtros por unidade, tag, status e receita da semana',
  })
  @ApiResponse({ status: 200, description: 'Lista de receitas retornada com sucesso' })
  @Get()
  list(@Query() filters: FilterRecipesDto) {
    return this.listRecipesUseCase.execute(filters);
  }

  @Public()
  @ApiOperation({
    summary: 'Busca uma receita completa (passos, ingredientes e produtos em destaque)',
  })
  @ApiResponse({ status: 200, description: 'Receita encontrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getRecipeUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cria uma nova receita com passos, ingredientes e produtos em destaque',
  })
  @ApiResponse({ status: 201, description: 'Receita criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Produto em destaque não pertence à unidade' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unidade' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @Post()
  create(@Body() dto: CreateRecipeDto, @CurrentUser() currentUser: User) {
    return this.createRecipeUseCase.execute(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Atualiza uma receita. Se steps/ingredients/products forem enviados, substituem os existentes',
  })
  @ApiResponse({ status: 200, description: 'Receita atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Produto em destaque não pertence à unidade' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unidade' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateRecipeUseCase.execute(id, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove permanentemente uma receita' })
  @ApiResponse({ status: 204, description: 'Receita removida com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unidade' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deleteRecipeUseCase.execute(id, currentUser);
  }
}
