import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { LegalPolicyService } from './services/legal-policy.service';

@Injectable()
export class LegalAccessGuard implements CanActivate {
  constructor(private readonly policy: LegalPolicyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: number } }>();
    if (!request.user || this.isRecoveryRoute(request)) return true;
    await this.policy.assertUser(request.user.id);
    return true;
  }

  private isRecoveryRoute(request: Request): boolean {
    const path = request.path;
    return (
      path.startsWith('/legal/') ||
      path.startsWith('/auth/') ||
      path.startsWith('/support') ||
      path === '/users/me' ||
      path === '/users/me/panel-access' ||
      path === '/users/me/account' ||
      path === '/units/mine' ||
      path === '/geocoding/resolve'
    );
  }
}
