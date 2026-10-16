import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UpdateOrderStatusUseCase } from './update-order-status.use-case';
import type { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import type { OrderAuthorizationService } from '../services/order-authorization.service';
import type { OrderStatusService } from '../services/order-status.service';
import { OrderStatusTransitionValidator } from '../validators/order-status-transition.validator';
import type { User } from '../../users/entities/user.entity';

describe('UpdateOrderStatusUseCase', () => {
  it.each([OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED])(
    'rejects generic delivery transition to %s',
    async (status) => {
      const orders = {
        findOne: async () => ({ id: 9, delivery_type: 'DELIVERY', status: 'READY' }),
      };
      const authorization = { assertCanManageOrder: async () => undefined };
      const transition = jest.fn();
      const service = new UpdateOrderStatusUseCase(
        orders as unknown as Repository<Order>,
        authorization as unknown as OrderAuthorizationService,
        { transition } as unknown as OrderStatusService,
        new OrderStatusTransitionValidator(),
      );
      await expect(service.execute(9, { status }, { id: 1 } as User)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transition).not.toHaveBeenCalled();
    },
  );
});
