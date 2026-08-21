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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Unit } from './entities/unit.entity';
import { UnitAuthorizationService } from './services/unit-authorization.service';

const UNIT_LOGOS_DIR = path.join(process.cwd(), 'uploads', 'units');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
ensureDir(UNIT_LOGOS_DIR);

function safeFileName(originalName: string) {
  const timestamp = Date.now();
  const base = originalName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
  return `${timestamp}-${base}`;
}

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Tipo de imagem inválido'), false);
  }
  cb(null, true);
}

@ApiTags('Units')
@Controller('units')
export class UnitsUploadController {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  @Post(':id/logo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Envia ou atualiza a logo da unidade' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 201, description: 'Imagem atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou não enviado' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador desta unidade' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, UNIT_LOGOS_DIR),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidade não encontrada');

    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    unit.image_url = `/uploads/units/${file.filename}`;
    await this.units.save(unit);

    return { ok: true, image_url: unit.image_url };
  }
}
