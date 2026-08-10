import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '../enums/global-role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
