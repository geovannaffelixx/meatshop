import { Injectable, Logger } from '@nestjs/common';
import { getMessaging } from 'firebase-admin/messaging';
import { FirebaseService } from '../../integrations/firebase/firebase.service';

export class FcmTokenInvalidError extends Error {}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  constructor(private readonly firebase: FirebaseService) {}

  async send(
    fcmToken: string,
    notification: { title: string; body: string },
    data: Record<string, string>,
  ): Promise<void> {
    const app = this.firebase.getApp();

    try {
      await getMessaging(app).send({
        token: fcmToken,
        notification,
        data,
        android: {
          priority: 'high',
          notification: { channelId: 'meatshop_channel' },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        throw new FcmTokenInvalidError(code);
      }

      this.logger.error('FCM send error', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}
