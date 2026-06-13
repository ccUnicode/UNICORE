import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlledRequest } from '../interfaces/access-controlled-request.interface';
import { AccessScopeOptions } from '../interfaces/access-scope-options.interface';
import { AreaRole } from '../enums/area-role.enum';
import { ACCESS_SCOPE_KEY } from '../decorators/access-scope.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

type ReflectorMetadata = AreaRole[] | AccessScopeOptions | undefined;

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  const createContext = (request: Partial<AccessControlledRequest>) => {
    const accessControlledRequest = request as AccessControlledRequest;
    accessControlledRequest.headers ??= {};
    accessControlledRequest.params ??= {};
    accessControlledRequest.body ??= {};

    return {
      switchToHttp: () => ({
        getRequest: () => accessControlledRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  const setupReflector = (
    requiredRoles: AreaRole[] | undefined,
    accessScope?: AccessScopeOptions,
  ) => {
    reflector = {
      getAllAndOverride: jest.fn((metadataKey: string): ReflectorMetadata => {
        if (metadataKey === ROLES_KEY) {
          return requiredRoles;
        }

        if (metadataKey === ACCESS_SCOPE_KEY) {
          return accessScope;
        }

        return undefined;
      }),
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  };

  it('allows requests without roles metadata', () => {
    setupReflector(undefined);

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('rejects requests with missing actor headers', () => {
    setupReflector([AreaRole.PRESIDENCIA]);

    expect(() => guard.canActivate(createContext({}))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects requests with invalid role headers', () => {
    setupReflector([AreaRole.PRESIDENCIA]);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            'x-role': 'invalid-role',
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows Presidencia to bypass area restrictions', () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.PRESIDENCIA,
          },
          params: {
            id: '999',
          },
        }),
      ),
    ).toBe(true);
  });

  it('allows Directiva de Area on its own area', () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.DIRECTIVA_DE_AREA,
            'x-area-id': '12',
          },
          params: {
            id: '12',
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects Directiva de Area on a foreign area', () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.DIRECTIVA_DE_AREA,
            'x-area-id': '12',
          },
          params: {
            id: '19',
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects Miembro when the role is not allowed', () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA]);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1',
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects Miembro without project ids', () => {
    setupReflector([AreaRole.MIEMBRO]);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows Miembro when the project scope matches', () => {
    setupReflector([AreaRole.MIEMBRO], {
      projectIdParam: 'projectId',
      requireProjectScope: true,
    });

    expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1, project-2',
          },
          params: {
            projectId: 'project-2',
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects Miembro outside its project scope', () => {
    setupReflector([AreaRole.MIEMBRO], {
      projectIdParam: 'projectId',
      requireProjectScope: true,
    });

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1, project-2',
          },
          params: {
            projectId: 'project-3',
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('attaches the parsed actor to the request', () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA]);

    const request: Partial<AccessControlledRequest> = {
      headers: {
        'x-role': AreaRole.DIRECTIVA_DE_AREA,
        'x-area-id': '5',
        'x-member-id': '17',
        'x-project-ids': 'project-1, project-2',
      },
    };

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.accessActor).toEqual({
      role: AreaRole.DIRECTIVA_DE_AREA,
      areaId: '5',
      memberId: '17',
      projectIds: ['project-1', 'project-2'],
    });
  });
});
