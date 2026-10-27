import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(@Headers('authorization') authorization?: string): Promise<string> {
    const expected = this.config.get<string>('METRICS_TOKEN')?.trim();
    const supplied = authorization?.replace(/^Bearer /, '');
    if (
      !expected ||
      !supplied ||
      Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    )
      throw new UnauthorizedException('Metrics credential required');
    return await this.metricsService.getMetrics();
  }
}
