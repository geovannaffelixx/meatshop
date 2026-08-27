import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Id do usuário que receberá a notificação', example: 5 })
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({ description: 'Unidade relacionada ao evento', example: 3 })
  @IsOptional()
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Título curto exibido no alerta', example: 'Novo pedido' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({
    description: 'Texto da notificação',
    example: 'Nova promoção disponível na sua unidade favorita!',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Rota interna aberta ao clicar', example: '/orders/42' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  action_url?: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  type: NotificationType;
}
