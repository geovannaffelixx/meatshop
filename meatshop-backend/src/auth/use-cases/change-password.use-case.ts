import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

const SALT_ROUNDS = 12;

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new UnauthorizedException('User not found');

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}