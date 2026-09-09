import type { Express } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SendSupportMessageDto } from './dtos/send-support-message.dto';
import { SendSupportMessageUseCase } from './use-cases/send-support-message.use-case';
import { MediaStorageService } from '../storage/media-storage.service';

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

function imageFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    callback(new BadRequestException('Envie somente imagens JPG, PNG, WEBP ou GIF'), false);
    return;
  }
  callback(null, true);
}

async function hasValidImageSignature(file: Express.Multer.File): Promise<boolean> {
  const bytes = file.buffer.subarray(0, 12);
  if (file.mimetype === 'image/jpeg')
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/gif') return bytes.subarray(0, 3).toString() === 'GIF';
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

@ApiTags('Support')
@ApiBearerAuth('access-token')
@Controller('support-tickets')
export class SupportUploadController {
  constructor(
    private readonly sendMessage: SendSupportMessageUseCase,
    private readonly storage: MediaStorageService,
  ) {}

  @Post(':id/messages')
  @ApiOperation({ summary: 'Envia uma mensagem com até quatro imagens no chamado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', maxLength: 4000 },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('images', 4, {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    }),
  )
  async createMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendSupportMessageDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() actor: User,
  ) {
    const signatures = await Promise.all(files.map(hasValidImageSignature));
    if (signatures.some((valid) => !valid)) {
      throw new BadRequestException('Uma das imagens possui conteúdo inválido');
    }
    const uploads = await Promise.all(
      files.map(async (file) => ({
        ...file,
        file_url: await this.storage.upload(file, 'support'),
      })),
    );
    return this.sendMessage.execute(id, dto.message, uploads, actor);
  }
}
