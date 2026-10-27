import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { SendNotificationUseCase } from '../notifications/use-cases/send-notification.use-case';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Controller('monitoring/alerts')
export class MonitoringController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DataSource,
    private readonly notifications: SendNotificationUseCase,
  ) {}

  @Public()
  @Post()
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: unknown,
  ) {
    const secret = this.config.get<string>('MONITORING_WEBHOOK_TOKEN', '');
    if (secret.length < 32)
      throw new ServiceUnavailableException('Monitoring receiver unavailable');
    const supplied = Buffer.from(authorization ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      throw new UnauthorizedException();
    if (
      !payload ||
      typeof payload !== 'object' ||
      !Array.isArray((payload as { alerts?: unknown }).alerts)
    )
      throw new BadRequestException('Invalid alert payload');
    const alerts = (payload as { alerts: unknown[] }).alerts;
    if (alerts.length > 100) throw new BadRequestException('Too many alerts');
    const admins = await this.db.query(
      "SELECT id FROM users WHERE global_role='SUPER_ADMIN' AND is_active=true",
    );
    for (const value of alerts) {
      if (!value || typeof value !== 'object') throw new BadRequestException('Invalid alert');
      const alert = value as {
        status?: string;
        labels?: { alertname?: string };
        annotations?: { summary?: string };
      };
      if (
        !['firing', 'resolved'].includes(alert.status ?? '') ||
        typeof alert.labels?.alertname !== 'string'
      )
        throw new BadRequestException('Invalid alert');
      for (const admin of admins)
        await this.notifications.execute(
          {
            user_id: admin.id,
            type: NotificationType.SYSTEM,
            title: `Monitoramento: ${alert.status === 'resolved' ? 'normalizado' : 'atenção'}`,
            message:
              `${alert.labels.alertname}: ${typeof alert.annotations?.summary === 'string' ? alert.annotations.summary : 'Verifique o monitoramento'}`.slice(
                0,
                1000,
              ),
          },
          { push: false },
        );
    }
    return { received: alerts.length };
  }
}
