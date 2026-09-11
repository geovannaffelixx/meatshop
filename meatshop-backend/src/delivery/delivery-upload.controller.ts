import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Buffer } from 'buffer';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { VehiclePhotoService } from './services/vehicle-photo.service';
import { MediaStorageService } from '../storage/media-storage.service';

const extensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

function imageFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
): void {
  if (!extensions.has(file.mimetype)) {
    callback(new BadRequestException('Upload only JPG, PNG, or WEBP images.'), false);
    return;
  }
  callback(null, true);
}

async function hasValidSignature(file: Express.Multer.File): Promise<boolean> {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (file.mimetype === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

@ApiTags('Delivery')
@ApiBearerAuth('access-token')
@Controller('delivery/me/vehicles')
export class DeliveryUploadController {
  constructor(
    private readonly photos: VehiclePhotoService,
    private readonly storage: MediaStorageService,
  ) {}

  @Post(':id/photos')
  @ApiOperation({
    summary: 'Adds a photo to the authenticated delivery person vehicle',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async add(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: User,
  ) {
    if (!file) throw new BadRequestException('File not provided.');
    if (!(await hasValidSignature(file))) {
      throw new BadRequestException('Invalid image content.');
    }
    const url = await this.storage.upload(file, 'vehicles');
    const vehicle = await this.photos.add(id, url, actor);
    return {
      url,
      vehicle,
    };
  }

  @Delete(':id/photos/:filename')
  @ApiOperation({
    summary: 'Removes a photo from the authenticated delivery person vehicle',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
    @CurrentUser() actor: User,
  ) {
    return this.photos.remove(id, filename, actor);
  }
}
