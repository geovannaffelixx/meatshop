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
import { memoryStorage } from 'multer';
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
import { MediaStorageService } from '../storage/media-storage.service';

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
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly storage: MediaStorageService,
  ) {}

  @Post('me/avatar')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Envia ou substitui o avatar do usuário autenticado',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
    await this.storage.delete(user.avatar_url);
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
      storage: memoryStorage(),
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
    const publicUrl = await this.storage.upload(file, 'avatars');
    await this.storage.delete(user.avatar_url);

    user.avatar_url = publicUrl;
    await this.users.save(user);

    return {
      ok: true,
      avatar_url: publicUrl,
      message: 'Imagem atualizada com sucesso',
    };
  }
}
