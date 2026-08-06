/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { AccessControlledRequest } from '../common/interfaces/access-controlled-request.interface';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { Member } from '../members/member.entity';
import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';

describe('AuthGuard', () => {
  const tokenService = {
    verify: jest.fn(),
  } as unknown as AuthTokenService;
  const membersRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Member>;

  const createContext = (request: Partial<AccessControlledRequest>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request as AccessControlledRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows explicitly public routes without credentials', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => key === IS_PUBLIC_KEY),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('rejects private routes without a Bearer token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loads the current member and ignores spoofable role headers', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);
    const member = {
      id: 7,
      firstNames: 'Ana',
      lastNames: 'Rojas',
      role: AreaRole.DIRECTIVA_DE_AREA,
      areaId: 3,
      activityStatus: MemberActivityStatus.ACTIVE,
      sessionVersion: 2,
    } as Member;
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
        'x-role': AreaRole.PRESIDENCIA,
      },
    } as Partial<AccessControlledRequest>;

    jest.mocked(tokenService.verify).mockReturnValue({
      sub: 7,
      ver: 2,
      iat: 1,
      exp: 2,
    });
    jest.mocked(membersRepository.findOne).mockResolvedValue(member);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.accessActor).toEqual({
      role: AreaRole.DIRECTIVA_DE_AREA,
      memberId: '7',
      areaId: '3',
      member: {
        firstNames: 'Ana',
        lastNames: 'Rojas',
      },
    });
    expect(request.authenticatedMember).toBe(member);
    expect(membersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: { projectMemberships: true, memberships: true },
    });
  });

  it('loads persisted project scope for authenticated members', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    } as Partial<AccessControlledRequest>;

    jest.mocked(tokenService.verify).mockReturnValue({
      sub: 9,
      ver: 4,
      iat: 1,
      exp: 2,
    });
    jest.mocked(membersRepository.findOne).mockResolvedValue({
      id: 9,
      role: AreaRole.MIEMBRO,
      areaId: null,
      activityStatus: MemberActivityStatus.ACTIVE,
      sessionVersion: 4,
      projectMemberships: [{ projectId: 3 }, { projectId: 8 }],
    } as Member);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.accessActor).toEqual({
      role: AreaRole.MIEMBRO,
      memberId: '9',
      areaId: undefined,
      projectIds: ['3', '8'],
    });
  });

  it('rejects inactive authenticated members', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);

    jest.mocked(tokenService.verify).mockReturnValue({
      sub: 7,
      ver: 0,
      iat: 1,
      exp: 2,
    });
    jest.mocked(membersRepository.findOne).mockResolvedValue({
      id: 7,
      activityStatus: MemberActivityStatus.INACTIVE,
    } as Member);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid-token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects disabled authenticated members', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);

    jest.mocked(tokenService.verify).mockReturnValue({
      sub: 7,
      ver: 0,
      iat: 1,
      exp: 2,
    });
    jest.mocked(membersRepository.findOne).mockResolvedValue({
      id: 7,
      activityStatus: MemberActivityStatus.ACTIVE,
      availabilityStatus: MemberAvailabilityStatus.DISABLED,
    } as Member);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid-token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens issued before the latest password change', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AuthGuard(reflector, tokenService, membersRepository);

    jest.mocked(tokenService.verify).mockReturnValue({
      sub: 7,
      ver: 2,
      iat: 1,
      exp: 2,
    });
    jest.mocked(membersRepository.findOne).mockResolvedValue({
      id: 7,
      role: AreaRole.PRESIDENCIA,
      activityStatus: MemberActivityStatus.ACTIVE,
      sessionVersion: 3,
    } as Member);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer stale-token' } }),
      ),
    ).rejects.toThrow('Authentication token has been revoked');
  });
});
