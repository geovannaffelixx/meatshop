import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnswerSupportTicketDto {
  @ApiProperty({
    description: 'Support team response to the ticket',
    example:
      'We identified the delay and your order is on the way. It will arrive within 20 minutes.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  response: string;
}
