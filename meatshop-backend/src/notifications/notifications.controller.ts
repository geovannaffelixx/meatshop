import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { ListNotificationsQueryDto } from './dtos/list-notifications-query.dto';
import { RegisterDeviceTokenDto } from './dtos/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dtos/unregister-device-token.dto';
import { ListNotificationsUseCase } from './use-cases/list-notifications.use-case';
import { MarkAllAsReadUseCase } from './use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { RegisterDeviceTokenUseCase } from './use-cases/register-device-token.use-case';
import { SendNotificationUseCase } from './use-cases/send-notification.use-case';
import { UnregisterDeviceTokenUseCase } from './use-cases/unregister-device-token.use-case';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    private readonly unregisterDeviceTokenUseCase: UnregisterDeviceTokenUseCase,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  @ApiOperation({ summary: 'Lista as notificações do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de notificações retornada com sucesso' })
  @Get()
  list(@Query() query: ListNotificationsQueryDto, @CurrentUser() currentUser: User) {
    return this.listNotificationsUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.markAsReadUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Marca todas as notificações do usuário como lidas' })
  @ApiResponse({ status: 204, description: 'Notificações marcadas como lidas' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('read-all')
  markAllAsRead(
    @CurrentUser() currentUser: User,
    @Query('unit_id', new ParseIntPipe({ optional: true })) unitId?: number,
  ) {
    return this.markAllAsReadUseCase.execute(currentUser, unitId);
  }

  @ApiOperation({
    summary: 'Registra (ou atualiza o dono de) um token FCM para receber push notifications',
  })
  @ApiResponse({ status: 204, description: 'Token registrado com sucesso' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('device-tokens')
  registerDeviceToken(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() currentUser: User) {
    return this.registerDeviceTokenUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Remove um token FCM do usuário autenticado (ex: ao fazer logout)' })
  @ApiResponse({ status: 204, description: 'Token removido com sucesso' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('device-tokens')
  unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto, @CurrentUser() currentUser: User) {
    return this.unregisterDeviceTokenUseCase.execute(dto.fcm_token, currentUser);
  }

  @ApiOperation({
    summary: 'Envia uma notificação manual para um usuário (restrito a SUPER_ADMIN)',
  })
  @ApiResponse({ status: 201, description: 'Notificação enviada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para enviar notificações' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Post()
  send(@Body() dto: CreateNotificationDto) {
    return this.sendNotificationUseCase.execute(dto);
  }
}
