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
    summary: 'Exchanges a Firebase ID token for a MeatShop session',
  })
  @ApiResponse({
    status: 200,
    description: 'MeatShop session issued successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'The first link requires the local account password',
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

  @ApiOperation({ summary: 'Registers a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 409,
    description: 'A user with this email or CPF already exists',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @ApiOperation({
    summary: 'Registers a butcher shop owner and unit, then authenticates the owner',
  })
  @ApiResponse({
    status: 201,
    description: 'Unit and owner created successfully and authenticated',
  })
  @ApiResponse({
    status: 409,
    description: 'A user with this email or CPF, or a unit with this CNPJ, already exists',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Public()
  @Post('register-unit')
  @HttpCode(HttpStatus.CREATED)
  async registerUnit(@Body() dto: RegisterUnitDto, @Res({ passthrough: true }) res: Response) {
    const { unit, ...tokens } = await this.registerUnitUseCase.execute(dto);
    this.setAuthCookies(res, tokens);
    return { ...tokens, unit };
  }

  @ApiOperation({
    summary: 'Authenticates a user and returns access tokens',
  })
  @ApiResponse({ status: 200, description: 'Login completed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
    summary: 'Ends the user session by invalidating the refresh token',
  })
  @ApiResponse({ status: 200, description: 'Logout completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refresh token' })
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
    summary: 'Renews the access token using a valid refresh token',
  })
  @ApiResponse({ status: 200, description: 'Tokens renewed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
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
    summary: 'Sends an email with the password reset link',
  })
  @ApiResponse({
    status: 200,
    description: 'Request processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @ApiOperation({
    summary: 'Resets the user password using a valid token',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto.token, dto.new_password);
  }

  @ApiOperation({
    summary: 'Verifies the user email using a verification token',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.verifyEmailUseCase.execute(dto.token);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Changes the authenticated user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Incorrect current password or unauthenticated user',
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
