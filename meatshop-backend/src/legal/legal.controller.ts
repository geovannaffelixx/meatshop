import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RecordLegalAcceptanceDto } from './dto/legal-acceptance.dto';
import { LegalPolicyService } from './services/legal-policy.service';
import { GetLegalHistoryUseCase } from './use-cases/get-legal-history.use-case';
import { RecordLegalAcceptanceUseCase } from './use-cases/record-legal-acceptance.use-case';

@ApiTags('Legal')
@ApiBearerAuth('access-token')
@Controller('legal')
export class LegalController {
  constructor(
    private readonly policy: LegalPolicyService,
    private readonly historyUseCase: GetLegalHistoryUseCase,
    private readonly recordAcceptance: RecordLegalAcceptanceUseCase,
  ) {}

  @Public()
  @Get('documents')
  @ApiOperation({ summary: 'Lists current legal documents for registration' })
  documents(@Query('audience') audience?: string) {
    return this.policy.catalog(audience === 'establishment');
  }

  @Public()
  @Get('documents/:id')
  @ApiOperation({ summary: 'Gets an immutable legal document version' })
  document(@Param('id', ParseIntPipe) id: number) {
    return this.policy.document(id);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Lists documents pending acceptance by the current user' })
  pending(
    @CurrentUser() user: User,
    @Query('unit_id', new ParseIntPipe({ optional: true })) unitId?: number,
  ) {
    return this.policy.pending(user.id, unitId);
  }

  @Get('acceptances')
  @ApiOperation({
    summary: 'Lists the current user acceptance and privacy acknowledgement history',
  })
  history(@CurrentUser() user: User) {
    return this.historyUseCase.execute(user.id);
  }

  @Post('acceptances')
  @ApiOperation({ summary: 'Records explicit acceptance of current documents' })
  accept(@CurrentUser() user: User, @Body() dto: RecordLegalAcceptanceDto) {
    return this.recordAcceptance.execute(user.id, dto);
  }
}
