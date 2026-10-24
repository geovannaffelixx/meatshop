import { UnitPermission } from '../common/enums/unit-permission.enum';
import { UnitMediaService } from './services/unit-media.service';
import { IsString, MaxLength } from 'class-validator';
import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  Delete,
  Query,
  UploadedFiles,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { User } from '../users/entities/user.entity';
import { Unit } from './entities/unit.entity';
import { UnitAuthorizationService } from './services/unit-authorization.service';
import { MediaStorageService } from '../storage/media-storage.service';

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Invalid image type'), false);
  }
  cb(null, true);
}

class RemoveUnitImageQueryDto {
  @IsString() @MaxLength(2048) url: string;
}

@ApiTags('Units')
@Controller('units')
export class UnitsUploadController {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly storage: MediaStorageService,
    private readonly media: UnitMediaService,
  ) {}

  @Post(':id/logo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Uploads or updates the unit logo' })
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
    description: 'User is not an administrator of this unit',
  })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ) {
    if (!file) throw new BadRequestException('File not provided');

    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unit.id,
      UnitPermission.MANAGE_UNIT,
    );

    const previousUrl = unit.image_url;
    unit.image_url = await this.storage.upload(file, 'units');
    await this.units.save(unit);
    await this.storage.delete(previousUrl);

    return { ok: true, image_url: unit.image_url };
  }

  @Post(':id/cover')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Replaces the unit cover shown in the marketplace' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  cover(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: User,
  ) {
    return this.media.upload(id, actor, file ? [file] : [], true);
  }

  @Post(':id/images')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Adds images to the unit gallery (maximum 10, 2 MB per image)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  images(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: User,
  ) {
    return this.media.upload(id, actor, files);
  }

  @Delete(':id/images')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Removes a gallery image belonging to this unit' })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: RemoveUnitImageQueryDto,
    @CurrentUser() actor: User,
  ) {
    return this.media.remove(id, actor, query.url);
  }
}
