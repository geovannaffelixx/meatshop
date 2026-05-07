import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { User } from '../../users/entities/user.entity';

@Injectable()
export class SeedService
  implements OnApplicationBootstrap {
  private readonly logger =
    new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) { }

  async onApplicationBootstrap() {
    const enabled =
      (
        process.env.SEED_ENABLED ??
        'true'
      ).toLowerCase() === 'true';

    if (!enabled) {
      this.logger.log(
        'Seeder disabled',
      );

      return;
    }

    const email =
      process.env.SEED_ADMIN_EMAIL ??
      'admin@meatshop.com';

    const password =
      process.env.SEED_ADMIN_PASSWORD ??
      'Admin123@';

    const existingUser =
      await this.usersRepo.findOne({
        where: {
          email,
        },
      });

    if (existingUser) {
      this.logger.log(
        `Admin already exists (${email})`,
      );

      return;
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const admin = new User();

    admin.name =
      'System Administrator';

    admin.email = email;

    admin.cpf =
      '00000000000';

    admin.password_hash =
      passwordHash;

    admin.global_role =
      'SUPER_ADMIN' as any;

    admin.app_profile =
      'BOTH' as any;

    admin.failed_login_attempts = 0;

    admin.locked_until = null;

    admin.email_verified = true;

    admin.email_verification_token =
      null;

    admin.password_reset_token =
      null;

    admin.password_reset_expires_at =
      null;

    await this.usersRepo.save(admin);

    this.logger.log(
      `Admin created (${email})`,
    );
  }
}