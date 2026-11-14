import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';

const participantKeys = new Set(['sender', 'user', 'assignee', 'responded_by_user']);
export function sanitizeSupportResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSupportResponse);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (participantKeys.has(key) && child && typeof child === 'object' && !Array.isArray(child)) {
        const profile = child as Record<string, unknown>;
        const fields = [
          'id',
          'name',
          'avatar_url',
          'global_role',
          ...(key === 'user' ? ['email'] : []),
        ];
        return [
          key,
          Object.fromEntries(
            fields.filter((field) => field in profile).map((field) => [field, profile[field]]),
          ),
        ];
      }
      return [key, sanitizeSupportResponse(child)];
    }),
  );
}

@Injectable()
export class SupportResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(sanitizeSupportResponse));
  }
}
