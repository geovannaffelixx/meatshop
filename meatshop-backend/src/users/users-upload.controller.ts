import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  Delete,
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
import * as crypto from 'crypto';
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
  const extension = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${extension}`;
}

// Valida o tipo de arquivo
function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Tipo de imagem inválido'), false);
  }
  cb(null, true);
}

@ApiTags('Users')
@Controller('users')
export class UsersUploadController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @Post('me/avatar')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Envia ou substitui o avatar do usuário autenticado',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadCurrentAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: number,
  ) {
    return this.persistAvatar(userId, file);
  }

  @Delete('me/avatar')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove o avatar do usuário autenticado' })
  async deleteCurrentAvatar(@CurrentUser('id') userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    this.deleteLocalAvatar(user.avatar_url);
    user.avatar_url = null;
    await this.users.save(user);
    return { ok: true, avatar_url: null };
  }

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
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') authUserId: number,
  ) {
    const isSelf = String(authUserId) === String(paramId);
    if (!isSelf) {
      throw new ForbiddenException('Sem permissão para alterar este usuário');
    }

    return this.persistAvatar(Number(paramId), file);
  }

  private async persistAvatar(userId: number, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    this.deleteLocalAvatar(user.avatar_url);
    const publicUrl = `/uploads/avatars/${file.filename}`;

    user.avatar_url = publicUrl;
    await this.users.save(user);

    return {
      ok: true,
      avatar_url: publicUrl,
      message: 'Imagem atualizada com sucesso',
    };
  }

  private deleteLocalAvatar(publicUrl: string | null): void {
    if (!publicUrl?.startsWith('/uploads/avatars/')) return;
    const filePath = path.join(AVATARS_DIR, path.basename(publicUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
