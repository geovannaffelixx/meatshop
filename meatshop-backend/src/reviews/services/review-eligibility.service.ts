import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ReviewEligibilityService {
  assertCanReview(order: Order, currentUser: User): void {
    if (order.client_id !== currentUser.id) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be reviewed');
    }
  }
}
