import { jest } from '@jest/globals';
import type { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../enums/notification-type.enum';
import type { Notification } from '../entities/notification.entity';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  it.each(Object.values(NotificationType))(
    'keeps the inbox but skips disabled %s push',
    async (type) => {
      const notification = {
        id: 9,
        user_id: 4,
        title: 'Oferta',
        message: 'Nova oferta',
        action_url: '/promotions/2',
        type,
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
        findOne: jest.fn(
          async () =>
            ({
              promotions_enabled: false,
              orders_enabled: false,
              delivery_enabled: false,
              system_enabled: false,
            }) as NotificationPreference,
        ),
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
          type,
        }),
      ).resolves.toBe(notification);
      expect(gateway.emitToUser).toHaveBeenCalledWith(notification);
      expect(deviceTokenRepository.find).not.toHaveBeenCalled();
      expect(fcmService.send).not.toHaveBeenCalled();
    },
  );

  it('uses enabled defaults when no preference row exists', async () => {
    const notification = { id: 1, user_id: 4, type: NotificationType.ORDER };
    const inbox = { create: jest.fn(() => notification), save: jest.fn(async () => notification) };
    const devices = { delete: jest.fn(async () => ({})), find: jest.fn(async () => []) };
    const preferences = { findOne: jest.fn(async () => null) };
    const gateway = { emitToUser: jest.fn() };
    const useCase = new SendNotificationUseCase(
      inbox as never,
      devices as never,
      preferences as never,
      {} as never,
      gateway as never,
    );
    await useCase.execute({ user_id: 4, type: NotificationType.ORDER, message: 'Order update' });
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(devices.find).toHaveBeenCalledTimes(1);
  });
});
