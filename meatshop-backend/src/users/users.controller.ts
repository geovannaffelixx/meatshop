import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { GetPanelContextUseCase } from './use-cases/get-panel-context.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly getPanelContextUseCase: GetPanelContextUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtém o perfil do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário retornado com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@CurrentUser() currentUser: User) {
    const user = await this.getUserProfileUseCase.execute(currentUser.id);
    const panel = await this.getPanelContextUseCase.execute(currentUser);
    return { ok: true, user, panel };
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualiza o nome e/ou e-mail do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async updateMe(@CurrentUser() currentUser: User, @Body() dto: UpdateProfileDto) {
    const user = await this.updateProfileUseCase.execute(currentUser.id, dto);
    return { ok: true, user };
  }
}
