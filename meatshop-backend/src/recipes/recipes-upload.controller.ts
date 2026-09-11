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
    return cb(new BadRequestException('Invalid image type'), false);
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
  @ApiOperation({ summary: 'Uploads or updates the recipe cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Image updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or no file provided' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the recipe unit',
  })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ) {
    if (!file) throw new BadRequestException('File not provided');

    const recipe = await this.recipes.findOne({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');

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
