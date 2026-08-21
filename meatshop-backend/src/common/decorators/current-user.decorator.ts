import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    return field ? user?.[field] : user;
  },
);
