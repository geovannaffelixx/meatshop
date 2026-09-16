import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics();
  }
}
