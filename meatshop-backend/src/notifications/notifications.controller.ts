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

  @ApiOperation({ summary: 'Lists the authenticated user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notification list returned successfully',
  })
  @Get()
  list(@Query() query: ListNotificationsQueryDto, @CurrentUser() currentUser: User) {
    return this.listNotificationsUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Marks a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.markAsReadUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Marks all user notifications as read' })
  @ApiResponse({ status: 204, description: 'Notifications marked as read' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('read-all')
  markAllAsRead(
    @CurrentUser() currentUser: User,
    @Query('unit_id', new ParseIntPipe({ optional: true })) unitId?: number,
  ) {
    return this.markAllAsReadUseCase.execute(currentUser, unitId);
  }

  @ApiOperation({
    summary: 'Registers or updates ownership of an FCM token for push notifications',
  })
  @ApiResponse({ status: 204, description: 'Token registered successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('device-tokens')
  registerDeviceToken(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() currentUser: User) {
    return this.registerDeviceTokenUseCase.execute(dto, currentUser);
  }

  @ApiOperation({
    summary: 'Removes an FCM token from the authenticated user, for example on logout',
  })
  @ApiResponse({ status: 204, description: 'Token removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('device-tokens')
  unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto, @CurrentUser() currentUser: User) {
    return this.unregisterDeviceTokenUseCase.execute(dto.fcm_token, currentUser);
  }

  @ApiOperation({
    summary: 'Sends a manual notification to a user, restricted to SUPER_ADMIN',
  })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to send notifications',
  })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Post()
  send(@Body() dto: CreateNotificationDto) {
    return this.sendNotificationUseCase.execute(dto);
  }
}
