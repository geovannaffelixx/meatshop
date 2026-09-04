import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private static readonly incompleteProfilePaths = new Set(['/users/me', '/geocoding/resolve']);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired token');
    }
    const path = context.switchToHttp().getRequest<{ path?: string }>().path;
    if (!user.profile_complete && !JwtAuthGuard.incompleteProfilePaths.has(path ?? '')) {
      throw new ForbiddenException({
        code: 'PROFILE_INCOMPLETE',
        message: 'Complete the required profile fields before continuing.',
      });
    }
    return user;
  }
}
