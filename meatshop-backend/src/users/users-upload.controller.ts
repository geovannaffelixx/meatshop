import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { User } from './entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');

// Garante que a pasta exista
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
ensureDir(AVATARS_DIR);

// Nomeia o arquivo de forma segura
function safeFileName(originalName: string) {
  const timestamp = Date.now();
  const base = originalName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
  return `${timestamp}-${base}`;
}

// Valida o tipo de arquivo
function imageFileFilter(req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Tipo de imagem inválido'), false);
  }
  cb(null, true);
}

@ApiTags('Users')
@Controller('users')
export class UsersUploadController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @Post(':id/logo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Envia ou atualiza a logo/avatar do usuário' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagem atualizada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou não enviado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para alterar este usuário',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadLogo(
    @Param('id') paramId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') authUserId: number,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    const isSelf = String(authUserId) === String(paramId);
    if (!isSelf) {
      throw new ForbiddenException('Sem permissão para alterar este usuário');
    }

    const user = await this.users.findOne({ where: { id: Number(paramId) } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const publicUrl = `/uploads/avatars/${file.filename}`;

    user.avatar_url = publicUrl;
    await this.users.save(user);

    return {
      ok: true,
      avatar_url: publicUrl,
      message: 'Imagem atualizada com sucesso',
    };
  }
}
