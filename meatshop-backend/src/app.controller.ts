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
  @ApiOperation({ summary: 'Retorna informações básicas da API' })
  @ApiResponse({ status: 200, description: 'Informações da API retornadas com sucesso' })
  @Get()
  root() {
    this.logger.log('Endpoint / chamado');
    return this.appService.getInfo();
  }

  @Public()
  @ApiOperation({ summary: 'Health check da aplicação (usado por CI/monitoramento)' })
  @ApiResponse({ status: 200, description: 'Aplicação está saudável' })
  @Get('health')
  health() {
    this.logger.log('Endpoint /health chamado');
    return this.appService.getHealth();
  }
}
