import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AreaRole } from '../enums/area-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AreaRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no tiene @Roles(), es público
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as JwtPayload | undefined;

    if (!user) throw new ForbiddenException('No autenticado');

    // Presidencia: acceso total
    if (user.role === AreaRole.PRESIDENCIA) return true;

    // Verificar que el usuario tiene al menos uno de los roles requeridos
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    // Directiva de Área: solo puede operar dentro de su propia área
    if (user.role === AreaRole.DIRECTIVA_DE_AREA) {
      const areaId =
        (request.params['areaId'] as string) ??
        (request.body as Record<string, string>)?.['areaId'];

      if (!areaId || areaId !== user.areaId) {
        throw new ForbiddenException('Solo puedes gestionar tu propia área');
      }
    }

    // Miembro: la restricción por proyecto se aplicará en capas superiores
    // cuando se implemente el módulo de proyectos

    return true;
  }
}
