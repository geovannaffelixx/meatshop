import { ExportPersonalReportUseCase } from './use-cases/export-personal-report.use-case';
import { ExportPersonalReportDto } from '../exports/dtos/export-personal-report.dto';
import type { Response } from 'express';
import { PersonalDataRetentionService } from './services/personal-data-retention.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { GetPanelContextUseCase } from './use-cases/get-panel-context.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { User } from './entities/user.entity';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly exportData: ExportPersonalReportUseCase,
    private readonly retention: PersonalDataRetentionService,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly getPanelContextUseCase: GetPanelContextUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

  @Get('me/export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Exports own personal data; OWNER/MANAGER: Excel/PDF, SUPER_ADMIN: Excel/PDF/JSON',
  })
  async exportMe(
    @CurrentUser() user: User,
    @Query() filters: ExportPersonalReportDto,
    @Res() response: Response,
  ) {
    const file = await this.exportData.execute(filters, user);
    response.setHeader('Content-Type', file.mime);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.buffer);
  }

  @Get('me/retention-policy')
  retentionPolicy() {
    return this.retention.policy();
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gets the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async me(@CurrentUser() currentUser: User) {
    const user = await this.getUserProfileUseCase.execute(currentUser.id);
    const panel = await this.getPanelContextUseCase.execute(currentUser);
    return { ok: true, user, panel };
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Updates the authenticated user name and/or email',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async updateMe(@CurrentUser() currentUser: User, @Body() dto: UpdateProfileDto) {
    const user = await this.updateProfileUseCase.execute(currentUser.id, dto);
    return { ok: true, user };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Deletes and anonymizes the authenticated user account',
  })
  @ApiResponse({
    status: 204,
    description: 'Account deleted and personal data anonymized',
  })
  async deleteMe(
    @CurrentUser() currentUser: User,
    @Headers('x-firebase-reauth-token') firebaseIdToken?: string,
  ): Promise<void> {
    await this.deleteAccountUseCase.execute(currentUser.id, firebaseIdToken);
  }
}
