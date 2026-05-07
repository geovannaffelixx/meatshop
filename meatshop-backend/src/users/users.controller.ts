import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const id =
      req.user?.id;

    const user =
      await this.usersRepo.findOne({
        where: {
          id,
        },
      });

    if (!user) {
      return {
        ok: false,
        message: 'User not found',
      };
    }

    return {
      ok: true,

      user: {
        id: user.id,

        name: user.name,

        email: user.email,

        globalRole:
          user.global_role,

        appProfile:
          user.app_profile,
      },
    };
  }
}