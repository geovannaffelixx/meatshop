import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { createCsrfToken, CSRF_COOKIE } from '../common/security/csrf';

@ApiTags('Auth')
@Controller('auth')
export class CsrfController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Issues a double-submit token for cookie-authenticated mutations' })
  issue(@Res({ passthrough: true }) response: Response): { csrf_token: string } {
    const token = createCsrfToken();
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(CSRF_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      sameSite:
        (this.config.get<string>('COOKIE_SAMESITE') as 'strict' | 'lax' | 'none') || 'strict',
      path: '/',
    });
    return { csrf_token: token };
  }
}
