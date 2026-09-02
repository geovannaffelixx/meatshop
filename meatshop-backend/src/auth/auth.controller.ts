import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterUnitDto } from './dto/register-unit.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { RegisterUnitUseCase } from './use-cases/register-unit.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { FirebaseExchangeDto } from './dto/firebase-exchange.dto';
import { FirebaseExchangeUseCase } from './use-cases/firebase-exchange.use-case';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly registerUnitUseCase: RegisterUnitUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly configService: ConfigService,
    private readonly firebaseExchangeUseCase: FirebaseExchangeUseCase,
  ) {}

  @ApiOperation({
    summary: 'Troca um Firebase ID Token por uma sessão MeatShop',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão MeatShop emitida com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Primeiro vínculo exige a senha da conta local',
  })
  @Public()
  @Post('firebase/exchange')
  @HttpCode(HttpStatus.OK)
  firebaseExchange(@Req() req: Request, @Body() dto: FirebaseExchangeDto) {
    const authorization = req.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({
        code: 'FIREBASE_TOKEN_REQUIRED',
        message: 'Firebase ID token is required.',
      });
    }
    return this.firebaseExchangeUseCase.execute(token, dto.password);
  }

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

  @ApiOperation({
    summary:
      'Registra o dono de uma unidade (açougue) e a própria unidade, já autenticando em seguida',
  })
  @ApiResponse({
    status: 201,
    description: 'Unidade e dono criados com sucesso, já autenticado',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um usuário com este e-mail/CPF, ou uma unidade com este CNPJ',
  })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @Public()
  @Post('register-unit')
  @HttpCode(HttpStatus.CREATED)
  async registerUnit(@Body() dto: RegisterUnitDto, @Res({ passthrough: true }) res: Response) {
    const { unit, ...tokens } = await this.registerUnitUseCase.execute(dto);
    this.setAuthCookies(res, tokens);
    return { ...tokens, unit };
  }

  @ApiOperation({
    summary: 'Autentica um usuário e retorna os tokens de acesso',
  })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.loginUseCase.execute(user);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @ApiOperation({
    summary: 'Encerra a sessão do usuário invalidando o refresh token',
  })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Refresh token inválido' })
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refresh_token || req.cookies?.refresh_token;
    if (!token) {
      throw new BadRequestException('refresh_token is required');
    }
    const result = await this.logoutUseCase.execute(token);
    this.clearAuthCookies(res);
    return result;
  }

  @ApiOperation({
    summary: 'Renova o token de acesso a partir de um refresh token válido',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refresh_token || req.cookies?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('refresh_token is required');
    }
    const tokens = await this.refreshTokenUseCase.execute(token);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @ApiOperation({
    summary: 'Envia um e-mail com o link de redefinição de senha',
  })
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

  @ApiOperation({
    summary: 'Redefine a senha do usuário a partir de um token válido',
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto.token, dto.new_password);
  }

  @ApiOperation({
    summary: 'Verifica o e-mail do usuário a partir de um token de verificação',
  })
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
  @ApiResponse({
    status: 401,
    description: 'Senha atual incorreta ou usuário não autenticado',
  })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser('id') userId: number, @Body() dto: ChangePasswordDto) {
    return this.changePasswordUseCase.execute(userId, dto.current_password, dto.new_password);
  }

  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ): void {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const sameSite =
      (this.configService.get<string>('COOKIE_SAMESITE') as 'strict' | 'lax' | 'none') || 'strict';

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }
}
