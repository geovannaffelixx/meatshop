import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

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
      user: {
        id: user.id,
        name: user.razaoSocial || user.usuario || 'Usuário',
        email: user.email,
        imageUrl: user.logoUrl ?? null,
        role: user.roleGlobal ?? 'USER',
      },
    };
  }
}
