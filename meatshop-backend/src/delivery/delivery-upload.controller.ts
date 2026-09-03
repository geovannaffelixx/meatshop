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
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { VehiclePhotoService } from './services/vehicle-photo.service';

const uploadDirectory = path.join(process.cwd(), 'uploads', 'vehicles');
fs.mkdirSync(uploadDirectory, { recursive: true });
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
    callback(new BadRequestException('Envie somente imagens JPG, PNG ou WEBP.'), false);
    return;
  }
  callback(null, true);
}

async function hasValidSignature(file: Express.Multer.File): Promise<boolean> {
  const bytes = await fs.promises.readFile(file.path);
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
  constructor(private readonly photos: VehiclePhotoService) {}

  @Post(':id/photos')
  @ApiOperation({ summary: 'Adiciona uma foto ao veículo do entregador autenticado' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) =>
          callback(null, `${randomUUID()}${extensions.get(file.mimetype)}`),
      }),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async add(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: User,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    try {
      if (!(await hasValidSignature(file))) {
        throw new BadRequestException('Conteúdo de imagem inválido.');
      }
      const vehicle = await this.photos.add(id, file.filename, actor);
      return {
        url: `/uploads/vehicles/${file.filename}`,
        vehicle,
      };
    } catch (error) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Delete(':id/photos/:filename')
  @ApiOperation({ summary: 'Remove uma foto do veículo do entregador autenticado' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
    @CurrentUser() actor: User,
  ) {
    return this.photos.remove(id, filename, actor);
  }
}
