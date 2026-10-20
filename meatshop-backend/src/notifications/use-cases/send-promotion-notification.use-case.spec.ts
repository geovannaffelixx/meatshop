import { jest } from '@jest/globals';
import type { Promotion } from '../../promotions/entities/promotion.entity';
import type { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { SendPromotionNotificationUseCase } from './send-promotion-notification.use-case';

describe('SendPromotionNotificationUseCase', () => {
  it('notifies only the eligible audience returned by the purchase and opt-in query', async () => {
    const recipients = [{ id: 4 }, { id: 8 }] as User[];
    const query = {
      innerJoin: jest.fn(),
      where: jest.fn(),
      distinct: jest.fn(),
      getMany: jest.fn(async () => recipients),
    };
    [query.innerJoin, query.where, query.distinct].forEach((value) => value.mockReturnValue(query));
    const users = { createQueryBuilder: jest.fn(() => query) };
    const sendNotification = { execute: jest.fn(async () => ({})) };
    const useCase = new SendPromotionNotificationUseCase(users as never, sendNotification as never);
    const promotion = {
      id: 12,
      unit_id: 3,
      title: 'Oferta da semana',
      description: 'Picanha em promoção',
    } as Promotion;

    await expect(useCase.execute(promotion)).resolves.toBe(2);

    expect(query.innerJoin).toHaveBeenCalledTimes(2);
    expect(query.where).toHaveBeenCalledWith('user.is_active = true');
    expect(query.distinct).toHaveBeenCalledWith(true);
    expect(sendNotification.execute).toHaveBeenCalledWith({
      user_id: 4,
      unit_id: 3,
      title: 'Oferta da semana',
      message: 'Picanha em promoção',
      type: NotificationType.PROMOTION,
    });
    expect(sendNotification.execute).toHaveBeenCalledTimes(2);
  });

  it('isolates a recipient failure so the remaining audience is still processed', async () => {
    const query = {
      innerJoin: jest.fn(),
      where: jest.fn(),
      distinct: jest.fn(),
      getMany: jest.fn(async () => [{ id: 4 }, { id: 8 }] as User[]),
    };
    [query.innerJoin, query.where, query.distinct].forEach((value) => value.mockReturnValue(query));
    let notificationCalls = 0;
    const sendNotification = {
      execute: jest.fn(async () => {
        if (notificationCalls++ === 0) throw new Error('database unavailable');
        return {};
      }),
    };
    const useCase = new SendPromotionNotificationUseCase(
      { createQueryBuilder: jest.fn(() => query) } as never,
      sendNotification as never,
    );

    await expect(
      useCase.execute({ id: 12, unit_id: 3, title: 'Oferta', description: null } as Promotion),
    ).resolves.toBe(1);
    expect(sendNotification.execute).toHaveBeenCalledTimes(2);
  });
});
