import { SetMetadata } from '@nestjs/common';
import { AccessScopeOptions } from '../interfaces/access-scope-options.interface';

export const ACCESS_SCOPE_KEY = 'access_scope';

export const AccessScope = (options: AccessScopeOptions) =>
  SetMetadata(ACCESS_SCOPE_KEY, options);
