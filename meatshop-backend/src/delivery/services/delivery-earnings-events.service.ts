import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DeliveryGateway } from '../delivery.gateway';

@Injectable()
export class DeliveryEarningsEventsService {
  private running = false;
  private readonly logger = new Logger(DeliveryEarningsEventsService.name);
  constructor(
    private readonly db: DataSource,
    private readonly gateway: DeliveryGateway,
  ) {}

  @Interval(2000)
  async dispatch(): Promise<void> {
    if (this.running || !this.gateway.server) return;
    this.running = true;
    try {
      await this.db.transaction(async (manager) => {
        const events: { id: string; order_id: number; user_id: number }[] = await manager.query(
          'SELECT id,order_id,user_id FROM delivery_earnings_events ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100',
        );
        for (const event of events) {
          this.gateway.server
            .to(`user:${event.user_id}`)
            .emit('delivery:earnings.updated', { orderId: event.order_id });
          await manager.query('DELETE FROM delivery_earnings_events WHERE id=$1', [event.id]);
        }
      });
    } catch {
      this.logger.warn('Delivery earnings notifications will be retried');
    } finally {
      this.running = false;
    }
  }
}
