import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { FirebaseService } from '../../integrations/firebase/firebase.service';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly firebase: FirebaseService,
  ) {}

  async execute(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (user.firebase_uid) await this.firebase.deleteUser(user.firebase_uid);

      await manager.update(
        'addresses',
        { user_id: userId },
        {
          label: 'Outro',
          street: 'Dado removido',
          number: '0',
          complement: null,
          neighborhood: 'Dado removido',
          city: 'Dado removido',
          state: 'NA',
          zip_code: '00000000',
          latitude: null,
          longitude: null,
          is_default: false,
        },
      );
      await manager.delete('refresh_tokens', { user_id: userId });
      await manager.delete('user_device_tokens', { user_id: userId });
      await manager.update(User, userId, {
        name: 'Usuário excluído',
        email: `deleted-${userId}-${Date.now()}@deleted.invalid`,
        cpf: null,
        phone: null,
        firebase_uid: null,
        password_hash: null,
        avatar_url: null,
        app_profile: null,
        profile_complete: false,
        is_active: false,
        failed_login_attempts: 0,
        locked_until: null,
      });
    });
  }
}
