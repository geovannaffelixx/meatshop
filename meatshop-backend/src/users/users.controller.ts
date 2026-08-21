import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtém o perfil do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário retornado com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@CurrentUser('id') userId: number) {
    const user = await this.getUserProfileUseCase.execute(userId);
    return { ok: true, user };
  }
}
