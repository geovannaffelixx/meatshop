import { Injectable } from '@nestjs/common';
import { AuthSessionService, type IAuthTokens } from '../services/auth-session.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly sessions: AuthSessionService) {}

  execute(rawToken: string): Promise<IAuthTokens> {
    return this.sessions.rotate(rawToken);
  }
}
