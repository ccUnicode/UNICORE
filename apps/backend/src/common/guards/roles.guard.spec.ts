import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
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

  let mockDataSource: any;

  const setupReflector = (
    requiredRoles: AreaRole[] | undefined,
    accessScope?: AccessScopeOptions,
    mockMemberStatus: string | null = null,
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

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue(
            mockMemberStatus ? { availabilityStatus: mockMemberStatus } : null,
          ),
      }),
    };

    guard = new RolesGuard(reflector, mockDataSource as unknown as DataSource);
  };

  it('allows requests without roles metadata', async () => {
    setupReflector(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
  });

  it('rejects requests from disabled members via header', async () => {
    setupReflector([AreaRole.MIEMBRO]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1',
            'x-status': 'disabled',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects requests from disabled members via database', async () => {
    setupReflector([AreaRole.MIEMBRO], undefined, 'disabled');

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1',
            'x-member-id': '10',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects requests with missing actor headers', async () => {
    setupReflector([AreaRole.PRESIDENCIA]);

    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects requests with invalid role headers', async () => {
    setupReflector([AreaRole.PRESIDENCIA]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': 'invalid-role',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows Presidencia to bypass area restrictions', async () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    await expect(
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
    ).resolves.toBe(true);
  });

  it('allows Directiva de Area on its own area', async () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    await expect(
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
    ).resolves.toBe(true);
  });

  it('rejects Directiva de Area on a foreign area', async () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA], { areaIdParam: 'id' });

    await expect(
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
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects Miembro when the role is not allowed', async () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
            'x-project-ids': 'project-1',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects Miembro without project ids', async () => {
    setupReflector([AreaRole.MIEMBRO]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-role': AreaRole.MIEMBRO,
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows Miembro when the project scope matches', async () => {
    setupReflector([AreaRole.MIEMBRO], {
      projectIdParam: 'projectId',
      requireProjectScope: true,
    });

    await expect(
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
    ).resolves.toBe(true);
  });

  it('rejects Miembro outside its project scope', async () => {
    setupReflector([AreaRole.MIEMBRO], {
      projectIdParam: 'projectId',
      requireProjectScope: true,
    });

    await expect(
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
    ).rejects.toThrow(ForbiddenException);
  });

  it('attaches the parsed actor to the request', async () => {
    setupReflector([AreaRole.DIRECTIVA_DE_AREA]);

    const request: Partial<AccessControlledRequest> = {
      headers: {
        'x-role': AreaRole.DIRECTIVA_DE_AREA,
        'x-area-id': '5',
        'x-member-id': '17',
        'x-project-ids': 'project-1, project-2',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.accessActor).toEqual({
      role: AreaRole.DIRECTIVA_DE_AREA,
      areaId: '5',
      memberId: '17',
      projectIds: ['project-1', 'project-2'],
    });
  });
});
