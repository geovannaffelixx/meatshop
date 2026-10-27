import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { cpfBlindIndex, phoneBlindIndex } from './user-identity-index';

@Injectable()
export class UserIdentityService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async assertEmailAvailable(email: string, ownerId?: number): Promise<void> {
    await this.assertAvailable({ email: email.toLowerCase().trim() }, ownerId, {
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists.',
    });
  }

  async assertCpfAvailable(cpf: string, ownerId?: number): Promise<void> {
    const cpfHash = cpfBlindIndex(cpf);
    if (!cpfHash) return;
    await this.assertAvailable({ cpf_hash: cpfHash }, ownerId, {
      code: 'CPF_ALREADY_EXISTS',
      message: 'An account with this CPF already exists.',
    });
  }

  async assertPhoneAvailable(phone: string, ownerId?: number): Promise<void> {
    const phoneHash = phoneBlindIndex(phone);
    if (!phoneHash) return;
    await this.assertAvailable({ phone_hash: phoneHash }, ownerId, {
      code: 'PHONE_ALREADY_EXISTS',
      message: 'An account with this phone number already exists.',
    });
  }

  private async assertAvailable(
    where: FindOptionsWhere<User>,
    ownerId: number | undefined,
    error: { code: string; message: string },
  ): Promise<void> {
    const existing = await this.users.findOne({ where, select: { id: true } });
    if (existing && existing.id !== ownerId) throw new ConflictException(error);
  }
}
