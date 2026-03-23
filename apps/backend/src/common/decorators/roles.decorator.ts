import { SetMetadata } from '@nestjs/common';
import { AreaRole } from '../enums/area-role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AreaRole[]) => SetMetadata(ROLES_KEY, roles);
