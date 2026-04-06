import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const id = req.user?.userId ?? req.user?.sub;
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      return { ok: false, message: 'Usuário não encontrado' };
    }

    delete (user as any).senhaHash;

    return {
      ok: true,
      user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async patchMe(@Req() req: any, @Body() body: any) {
    const id = req.user?.userId ?? req.user?.sub;
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      return { ok: false, message: 'Usuário não encontrado' };
    }

    // Campos permitidos para atualização
    const allowedFields: (keyof User)[] = [
      'nomeFantasia',
      'razaoSocial',
      'cnpj',
      'telefone',
      'celular',
      'cep',
      'logradouro',
      'numero',
      'complemento',
      'bairro',
      'cidade',
      'estado',
      'pais',
      'descricao',
    ];

    allowedFields.forEach((field) => {
      if (body[field as string] !== undefined) {
        (user as any)[field] = body[field as string];
      }
    });

    await this.usersRepo.save(user);

    delete (user as any).senhaHash;
    return { ok: true, message: 'Perfil atualizado com sucesso', user };
  }
}
