import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiOperation({ summary: 'Returns basic API information' })
  @ApiResponse({
    status: 200,
    description: 'API information returned successfully',
  })
  @Get()
  root() {
    this.logger.log('Endpoint / called');
    return this.appService.getInfo();
  }

  @Public()
  @ApiOperation({
    summary: 'Application health check used by CI and monitoring',
  })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @Get('health')
  health() {
    this.logger.log('Endpoint /health called');
    return this.appService.getHealth();
  }
}
