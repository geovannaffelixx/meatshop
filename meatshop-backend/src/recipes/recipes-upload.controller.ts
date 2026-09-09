import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { User } from '../users/entities/user.entity';
import { Recipe } from './entities/recipe.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { MediaStorageService } from '../storage/media-storage.service';

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Tipo de imagem inválido'), false);
  }
  cb(null, true);
}

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesUploadController {
  constructor(
    @InjectRepository(Recipe) private readonly recipes: Repository<Recipe>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly storage: MediaStorageService,
  ) {}

  @Post(':id/image')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Envia ou atualiza a foto de capa da receita' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 201, description: 'Imagem atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou não enviado' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade da receita' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    const recipe = await this.recipes.findOne({ where: { id } });
    if (!recipe) throw new NotFoundException('Receita não encontrada');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      recipe.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    const previousUrl = recipe.image_url;
    recipe.image_url = await this.storage.upload(file, 'recipes');
    await this.recipes.save(recipe);
    await this.storage.delete(previousUrl);

    return { ok: true, image_url: recipe.image_url };
  }
}
