// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request } from 'express';
import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

import { User } from './entities/user.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

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

@Controller('users')
export class UsersUploadController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/logo')
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
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    const authUserId = req.user?.userId ?? req.user?.sub;
    const isSelf = String(authUserId) === String(paramId);
    if (!isSelf) {
      throw new ForbiddenException('Sem permissão para alterar este usuário');
    }

    const user = await this.users.findOne({ where: { id: Number(paramId) } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const publicUrl = `/uploads/${file.filename}`;

    (user as any).logoUrl = publicUrl;
    await this.users.save(user);

    return {
      ok: true,
      logoUrl: publicUrl,
      message: 'Imagem atualizada com sucesso',
    };
  }
}
