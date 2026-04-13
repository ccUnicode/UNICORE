import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlledRequest } from '../interfaces/access-controlled-request.interface';
import { AccessScopeOptions } from '../interfaces/access-scope-options.interface';
import { RequestAccessActor } from '../interfaces/request-access-actor.interface';
import { AreaRole } from '../enums/area-role.enum';
import { ACCESS_SCOPE_KEY } from '../decorators/access-scope.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { extractRequestAccessActor } from '../utils/request-access-actor.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AreaRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AccessControlledRequest>();
    const accessActor = extractRequestAccessActor(request.headers);

    if (!accessActor) {
      throw new ForbiddenException('Missing or invalid access actor headers');
    }

    request.accessActor = accessActor;

    if (accessActor.role === AreaRole.PRESIDENCIA) {
      return true;
    }

    if (!requiredRoles.includes(accessActor.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    const accessScope = this.reflector.getAllAndOverride<
      AccessScopeOptions | undefined
    >(ACCESS_SCOPE_KEY, [context.getHandler(), context.getClass()]);

    if (!accessScope) {
      return true;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      this.validateAreaScope(accessActor, request, accessScope);
    }

    if (accessActor.role === AreaRole.MIEMBRO) {
      this.validateProjectScope(accessActor, request, accessScope);
    }

    return true;
  }

  private validateAreaScope(
    accessActor: RequestAccessActor,
    request: AccessControlledRequest,
    accessScope: AccessScopeOptions,
  ): void {
    const targetAreaId = this.getScopedValue(
      request,
      accessScope.areaIdParam,
      accessScope.areaIdBodyKey,
    );

    if (targetAreaId && targetAreaId !== accessActor.areaId) {
      throw new ForbiddenException('Area-scoped access is limited to your own area');
    }
  }

  private validateProjectScope(
    accessActor: RequestAccessActor,
    request: AccessControlledRequest,
    accessScope: AccessScopeOptions,
  ): void {
    const targetProjectId = this.getScopedValue(
      request,
      accessScope.projectIdParam,
      accessScope.projectIdBodyKey,
    );

    if (!targetProjectId && !accessScope.requireProjectScope) {
      return;
    }

    if (!accessActor.projectIds?.length) {
      throw new ForbiddenException('Project-scoped access requires project participation');
    }

    if (targetProjectId && !accessActor.projectIds.includes(targetProjectId)) {
      throw new ForbiddenException('Project-scoped access is limited to your own projects');
    }
  }

  private getScopedValue(
    request: AccessControlledRequest,
    paramKey?: string,
    bodyKey?: string,
  ): string | undefined {
    if (paramKey) {
      const paramValue = request.params?.[paramKey];

      if (typeof paramValue === 'string' && paramValue.trim().length > 0) {
        return paramValue.trim();
      }
    }

    if (bodyKey && this.isPlainObject(request.body)) {
      const bodyValue = request.body[bodyKey];

      if (typeof bodyValue === 'string' && bodyValue.trim().length > 0) {
        return bodyValue.trim();
      }

      if (typeof bodyValue === 'number') {
        return String(bodyValue);
      }
    }

    return undefined;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
