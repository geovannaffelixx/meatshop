import { jest } from '@jest/globals';
import type { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../enums/notification-type.enum';
import type { Notification } from '../entities/notification.entity';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  it('keeps the inbox notification but skips push when its type is disabled', async () => {
    const notification = {
      id: 9,
      user_id: 4,
      title: 'Oferta',
      message: 'Nova oferta',
      action_url: '/promotions/2',
      type: NotificationType.PROMOTION,
    } as Notification;
    const notificationRepository = {
      create: jest.fn(() => notification),
      save: jest.fn(async () => notification),
    };
    const deviceTokenRepository = {
      delete: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    const preferenceRepository = {
      findOne: jest.fn(async () => ({ promotions_enabled: false }) as NotificationPreference),
    };
    const fcmService = { send: jest.fn() };
    const gateway = { emitToUser: jest.fn() };
    const useCase = new SendNotificationUseCase(
      notificationRepository as never,
      deviceTokenRepository as never,
      preferenceRepository as never,
      fcmService as never,
      gateway as never,
    );

    await expect(
      useCase.execute({
        user_id: 4,
        title: 'Oferta',
        message: 'Nova oferta',
        action_url: '/promotions/2',
        type: NotificationType.PROMOTION,
      }),
    ).resolves.toBe(notification);
    expect(gateway.emitToUser).toHaveBeenCalledWith(notification);
    expect(deviceTokenRepository.find).not.toHaveBeenCalled();
    expect(fcmService.send).not.toHaveBeenCalled();
  });
});
