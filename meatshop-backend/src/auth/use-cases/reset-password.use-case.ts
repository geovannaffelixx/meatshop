import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

const SALT_ROUNDS = 12;

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { password_reset_token: token },
    });

    this.assertTokenIsValid(user);

    user!.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user!.password_reset_token = null;
    user!.password_reset_expires_at = null;

    await this.userRepository.save(user!);

    return { message: 'Password updated successfully' };
  }

  private assertTokenIsValid(user: User | null): void {
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (!user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}