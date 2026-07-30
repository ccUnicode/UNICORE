/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { Member } from '../members/member.entity';
import { MembersService } from '../members/members.service';
import { AuthTokenService } from './auth-token.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const queryBuilder = {
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };
  const entityManager = {
    query: jest.fn(),
    getRepository: jest.fn(),
  };
  const transaction = jest.fn(
    async (callback: (manager: typeof entityManager) => Promise<unknown>) =>
      callback(entityManager),
  );
  const membersRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    manager: {
      transaction,
    },
  } as unknown as Repository<Member>;
  const membersService = {
    create: jest.fn(),
  } as unknown as MembersService;
  const passwordService = {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as PasswordService;
  const tokenService = {
    sign: jest.fn(),
  } as unknown as AuthTokenService;
  const bootstrapSecret = 'bootstrap-secret-that-is-at-least-32-characters';
  const config = {
    get: jest.fn((key: string) =>
      key === 'AUTH_BOOTSTRAP_SECRET' ? bootstrapSecret : undefined,
    ),
  } as unknown as ConfigService;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    entityManager.getRepository.mockReturnValue(membersRepository);
    jest
      .mocked(membersRepository.createQueryBuilder)
      .mockReturnValue(queryBuilder as never);
    service = new AuthService(
      membersRepository,
      membersService,
      passwordService,
      tokenService,
      config,
    );
  });

  it('bootstraps an existing Presidencia member before any password exists', async () => {
    const member = {
      id: 4,
      role: AreaRole.PRESIDENCIA,
      institution: 'UNI',
      studentCode: '20260004',
      activityStatus: MemberActivityStatus.ACTIVE,
      sessionVersion: 0,
    } as Member;

    queryBuilder.getCount.mockResolvedValue(0);
    jest.mocked(membersRepository.findOne).mockResolvedValue(member);
    jest.mocked(passwordService.hash).mockResolvedValue('stored-hash');
    jest.mocked(tokenService.sign).mockReturnValue('signed-token');

    await expect(
      service.bootstrap({
        bootstrapSecret,
        memberId: 4,
        password: 'a-secure-password',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      member,
    });
    expect(membersRepository.update).toHaveBeenCalledWith(4, {
      passwordHash: 'stored-hash',
      sessionVersion: 1,
    });
    expect(tokenService.sign).toHaveBeenCalledWith(4, 1);
    expect(entityManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1::bigint)',
      [1973111041],
    );
  });

  it('rejects bootstrap after an account password exists', async () => {
    queryBuilder.getCount.mockResolvedValue(1);

    await expect(
      service.bootstrap({
        bootstrapSecret,
        memberId: 4,
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an invalid bootstrap secret before reading account state', async () => {
    await expect(
      service.bootstrap({
        bootstrapSecret: 'invalid-secret-that-is-at-least-32-characters',
        memberId: 4,
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'external',
      member: {
        institution: 'PUCP',
        studentCode: '20260004',
        activityStatus: MemberActivityStatus.ACTIVE,
      },
    },
    {
      label: 'inactive',
      member: {
        institution: 'UNI',
        studentCode: '20260004',
        activityStatus: MemberActivityStatus.INACTIVE,
      },
    },
    {
      label: 'without a student code',
      member: {
        institution: 'UNI',
        studentCode: null,
        activityStatus: MemberActivityStatus.ACTIVE,
      },
    },
  ])(
    'rejects bootstrap for a $label Presidencia member',
    async ({ member }) => {
      queryBuilder.getCount.mockResolvedValue(0);
      jest.mocked(membersRepository.findOne).mockResolvedValue({
        id: 4,
        role: AreaRole.PRESIDENCIA,
        sessionVersion: 0,
        ...member,
      } as Member);

      await expect(
        service.bootstrap({
          bootstrapSecret,
          memberId: 4,
          password: 'a-secure-password',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(membersRepository.update).not.toHaveBeenCalled();
    },
  );

  it('returns a token for valid active credentials without exposing the hash', async () => {
    const member = {
      id: 7,
      institution: 'UNI',
      studentCode: '20260007',
      passwordHash: 'stored-hash',
      activityStatus: MemberActivityStatus.ACTIVE,
      sessionVersion: 5,
    } as Member;

    queryBuilder.getOne.mockResolvedValue(member);
    jest.mocked(passwordService.verify).mockResolvedValue(true);
    jest.mocked(tokenService.sign).mockReturnValue('signed-token');

    const response = await service.login({
      studentCode: '20260007',
      password: 'a-secure-password',
    });

    expect(response).toMatchObject({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
    });
    expect(response.member.passwordHash).toBeUndefined();
    expect(tokenService.sign).toHaveBeenCalledWith(7, 5);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'member.institution = :institution',
      { institution: 'UNI' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'member.studentCode = :studentCode',
      { studentCode: '20260007' },
    );
  });

  it('performs password verification when the student code is unknown', async () => {
    queryBuilder.getOne.mockResolvedValue(null);
    jest.mocked(passwordService.verify).mockResolvedValue(false);

    await expect(
      service.login({
        studentCode: 'unknown',
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwordService.verify).toHaveBeenCalledWith(
      'a-secure-password',
      expect.stringMatching(/^scrypt\$16384\$8\$1\$/),
    );
  });

  it('rejects login for active but disabled members', async () => {
    const member = {
      id: 7,
      institution: 'UNI',
      studentCode: '20260007',
      passwordHash: 'stored-hash',
      activityStatus: MemberActivityStatus.ACTIVE,
      availabilityStatus: MemberAvailabilityStatus.DISABLED,
      sessionVersion: 5,
    } as Member;

    queryBuilder.getOne.mockResolvedValue(member);
    jest.mocked(passwordService.verify).mockResolvedValue(true);

    await expect(
      service.login({
        studentCode: '20260007',
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('increments the session version when changing a password', async () => {
    jest.mocked(membersRepository.findOne).mockResolvedValue({
      id: 7,
      sessionVersion: 5,
    } as Member);
    jest.mocked(passwordService.hash).mockResolvedValue('new-hash');

    await expect(service.setPassword(7, 'a-new-secure-password')).resolves.toBe(
      6,
    );
    expect(membersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(membersRepository.update).toHaveBeenCalledWith(7, {
      passwordHash: 'new-hash',
      sessionVersion: 6,
    });
  });
});
