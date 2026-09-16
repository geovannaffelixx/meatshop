import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class VerifyEmailUseCase {
  private readonly logger = new Logger(VerifyEmailUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email_verification_token: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.email_verified) {
      return { message: 'Email already verified' };
    }

    user.email_verified = true;
    user.email_verification_token = null;
    await this.userRepository.save(user);

    this.logger.log(`Email verified for user ${user.id}`);

    return { message: 'Email verified successfully' };
  }
}
