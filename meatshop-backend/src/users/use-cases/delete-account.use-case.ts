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
          street: 'Data removed',
          number: '0',
          complement: null,
          neighborhood: 'Data removed',
          city: 'Data removed',
          state: 'NA',
          zip_code: '00000000',
          latitude: null,
          longitude: null,
          is_default: false,
        },
      );
      await manager.query(
        'DELETE FROM delivery_tracking WHERE order_id IN (SELECT id FROM orders WHERE client_id=$1 OR delivery_person_id IN (SELECT id FROM delivery_persons WHERE user_id=$1))',
        [userId],
      );
      await manager.query('UPDATE orders SET destination_snapshot=NULL WHERE client_id=$1', [
        userId,
      ]);
      await manager.query(
        'UPDATE orders SET tracking_session_id=NULL, tracking_revoked_at=now() WHERE client_id=$1 OR tracking_consent_user_id=$1',
        [userId],
      );
      await manager.delete('refresh_tokens', { user_id: userId });
      await manager.delete('user_device_tokens', { user_id: userId });
      await manager.update(User, userId, {
        name: 'Deleted user',
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
