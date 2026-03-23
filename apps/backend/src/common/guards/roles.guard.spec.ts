import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AreaRole } from '../enums/area-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const AREA_ID = 'area-uuid-1';
const OTHER_AREA_ID = 'area-uuid-2';

function buildContext(
  user: JwtPayload | undefined,
  params: Record<string, string> = {},
  body: Record<string, string> = {},
  requiredRoles: AreaRole[] = [AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO],
): ExecutionContext {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
  const request = { user, params, body };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, reflector };
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  function setup(requiredRoles: AreaRole[]) {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  }

  function makeContext(
    user: JwtPayload | undefined,
    params: Record<string, string> = {},
    body: Record<string, string> = {},
  ): ExecutionContext {
    const request = { user, params, body };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  // ✅ PRESIDENCIA: acceso total a cualquier área
  it('PRESIDENCIA puede acceder a cualquier área', () => {
    setup([AreaRole.DIRECTIVA_DE_AREA]);
    const user: JwtPayload = { sub: 'u1', role: AreaRole.PRESIDENCIA, areaId: AREA_ID };
    const ctx = makeContext(user, { areaId: OTHER_AREA_ID });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ✅ DIRECTIVA accede a su propia área
  it('DIRECTIVA_DE_AREA puede acceder a su propia área', () => {
    setup([AreaRole.DIRECTIVA_DE_AREA]);
    const user: JwtPayload = { sub: 'u2', role: AreaRole.DIRECTIVA_DE_AREA, areaId: AREA_ID };
    const ctx = makeContext(user, { areaId: AREA_ID });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ❌ DIRECTIVA intenta acceder a otra área
  it('DIRECTIVA_DE_AREA no puede acceder a otra área', () => {
    setup([AreaRole.DIRECTIVA_DE_AREA]);
    const user: JwtPayload = { sub: 'u2', role: AreaRole.DIRECTIVA_DE_AREA, areaId: AREA_ID };
    const ctx = makeContext(user, { areaId: OTHER_AREA_ID });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ✅ MIEMBRO con acceso base
  it('MIEMBRO puede pasar la validación base de roles', () => {
    setup([AreaRole.MIEMBRO]);
    const user: JwtPayload = { sub: 'u3', role: AreaRole.MIEMBRO, areaId: AREA_ID };
    const ctx = makeContext(user);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ❌ MIEMBRO intenta acceder a un endpoint restringido a DIRECTIVA
  it('MIEMBRO no puede acceder a endpoints exclusivos de DIRECTIVA', () => {
    setup([AreaRole.DIRECTIVA_DE_AREA]);
    const user: JwtPayload = { sub: 'u3', role: AreaRole.MIEMBRO, areaId: AREA_ID };
    const ctx = makeContext(user, { areaId: AREA_ID });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ✅ Sin @Roles() el endpoint es público
  it('sin @Roles() el endpoint es accesible para todos', () => {
    setup([]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
