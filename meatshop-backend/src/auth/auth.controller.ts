import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  @ApiOperation({ summary: 'Registra um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({
    status: 409,
    description: 'Já existe um usuário com este e-mail ou CPF',
  })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Autentica um usuário e retorna os tokens de acesso' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@CurrentUser() user: User) {
    return this.loginUseCase.execute(user);
  }

  @ApiOperation({ summary: 'Encerra a sessão do usuário invalidando o refresh token' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Refresh token inválido' })
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.logoutUseCase.execute(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Renova o token de acesso a partir de um refresh token válido' })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Envia um e-mail com o link de redefinição de senha' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação processada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'E-mail inválido' })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @ApiOperation({ summary: 'Redefine a senha do usuário a partir de um token válido' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto.token, dto.new_password);
  }

  @ApiOperation({ summary: 'Verifica o e-mail do usuário a partir de um token de verificação' })
  @ApiResponse({ status: 200, description: 'E-mail verificado com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.verifyEmailUseCase.execute(dto.token);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Altera a senha do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta ou usuário não autenticado' })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.changePasswordUseCase.execute(
      userId,
      dto.current_password,
      dto.new_password,
    );
  }
}
