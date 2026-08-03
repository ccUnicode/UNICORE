import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  ObjectLiteral,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { Skill } from '../skills/skill.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { MemberActivityStatus } from './enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from './enums/member-availability-status.enum';
import { Member } from './member.entity';
import { MembersService } from './members.service';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { toMemberResponse } from './utils/member-response.util';

type MemberRepositoryMock = Partial<
  Record<keyof Repository<Member>, jest.Mock>
>;
type SkillRepositoryMock = Partial<Record<keyof Repository<Skill>, jest.Mock>>;
type AreaRepositoryMock = Partial<Record<keyof Repository<Area>, jest.Mock>>;
type AreaMembershipRepositoryMock = Partial<
  Record<keyof Repository<AreaMembership>, jest.Mock>
>;

const createSkill = (
  id: number,
  name: string,
  overrides: Partial<Skill> = {},
): Skill => ({
  id,
  name,
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [],
  ...overrides,
});

const createQueryBuilderMock = (members: Member[]) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(members),
});

describe('MembersService', () => {
  let service: MembersService;
  let membersRepository: MemberRepositoryMock;
  let skillsRepository: SkillRepositoryMock;
  let areasRepository: AreaRepositoryMock;
  let areaMembershipsRepository: AreaMembershipRepositoryMock;
  let mockDataSource: DataSource;
  let persistedAreaDirectiveMember: Member;
  let persistedSkills: Skill[];

  const areaDirectiveMemberDto: CreateMemberDto = {
    institution: 'UNI',
    studentCode: '20230001',
    firstNames: 'Ana Lucia',
    lastNames: 'Rojas Perez',
    major: 'Ingenieria de Sistemas',
    birthDate: '2004-04-18',
    areaId: 3,
    role: AreaRole.DIRECTIVA_DE_AREA,
    skills: ['typescript', 'testing'],
  };

  const externalMemberDto: CreateMemberDto = {
    institution: 'PUCP',
    firstNames: 'Lucia',
    lastNames: 'Campos Rivera',
    major: 'Diseno',
    birthDate: '2001-09-10',
    role: AreaRole.MIEMBRO,
    skills: ['facilitacion'],
  };

  beforeEach(async () => {
    membersRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      preload: jest.fn(),
    };
    skillsRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    areasRepository = {
      exists: jest.fn(),
    };
    areaMembershipsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockEntityManager = {
      getRepository: <T extends ObjectLiteral>(
        entity: new () => T,
      ): Repository<T> => {
        if ((entity as any) === Member)
          return membersRepository as unknown as Repository<T>;
        if ((entity as any) === Skill)
          return skillsRepository as unknown as Repository<T>;
        if ((entity as any) === Area)
          return areasRepository as unknown as Repository<T>;
        if ((entity as any) === AreaMembership)
          return areaMembershipsRepository as unknown as Repository<T>;
        throw new Error('Entity not mocked');
      },
    } as unknown as EntityManager;

    mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation(<T>(cb: (em: EntityManager) => Promise<T>) =>
          cb(mockEntityManager),
        ),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: getRepositoryToken(Member),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(Skill),
          useValue: skillsRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: areasRepository,
        },
        {
          provide: getRepositoryToken(AreaMembership),
          useValue: areaMembershipsRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    persistedSkills = [createSkill(1, 'typescript'), createSkill(2, 'testing')];
    persistedAreaDirectiveMember = {
      id: 10,
      institution: areaDirectiveMemberDto.institution,
      studentCode: areaDirectiveMemberDto.studentCode ?? null,
      firstNames: areaDirectiveMemberDto.firstNames,
      lastNames: areaDirectiveMemberDto.lastNames,
      major: areaDirectiveMemberDto.major,
      birthDate: areaDirectiveMemberDto.birthDate,
      cycle: null,
      activityStatus: MemberActivityStatus.ACTIVE,
      availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      skills: persistedSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [
        {
          id: 50,
          memberId: 10,
          role: AreaRole.DIRECTIVA_DE_AREA,
          area: { id: 3 } as Area,
        } as AreaMembership,
      ],
      projectMemberships: [],
      get role(): AreaRole {
        return AreaRole.DIRECTIVA_DE_AREA;
      },
      get areaId(): number | null {
        return 3;
      },
    } as Member;
  });

  it('creates and persists an area directive member', async () => {
    areasRepository.exists?.mockResolvedValue(true);
    skillsRepository.find?.mockResolvedValue(persistedSkills);
    membersRepository.create?.mockReturnValue(persistedAreaDirectiveMember);
    membersRepository.save?.mockResolvedValue(persistedAreaDirectiveMember);

    await expect(service.create(areaDirectiveMemberDto)).resolves.toEqual(
      persistedAreaDirectiveMember,
    );
    expect(areasRepository.exists).toHaveBeenCalledWith({
      where: { id: 3, isArchived: false },
    });
    expect(skillsRepository.find).toHaveBeenCalledWith({
      where: {
        name: In(['typescript', 'testing']),
      },
    });
    expect(membersRepository.create).toHaveBeenCalledWith({
      institution: areaDirectiveMemberDto.institution,
      studentCode: areaDirectiveMemberDto.studentCode,
      firstNames: areaDirectiveMemberDto.firstNames,
      lastNames: areaDirectiveMemberDto.lastNames,
      major: areaDirectiveMemberDto.major,
      birthDate: areaDirectiveMemberDto.birthDate,
      role: areaDirectiveMemberDto.role,
      skills: persistedSkills,
    });
    expect(membersRepository.save).toHaveBeenCalledWith(
      persistedAreaDirectiveMember,
    );
    expect(areaMembershipsRepository.create).toHaveBeenCalledWith({
      member: persistedAreaDirectiveMember,
      area: { id: 3 },
      role: AreaRole.DIRECTIVA_DE_AREA,
    });
    expect(areaMembershipsRepository.save).toHaveBeenCalled();
  });

  it('rejects an unknown or archived area when creating a member', async () => {
    areasRepository.exists?.mockResolvedValue(false);

    await expect(
      service.create({
        ...areaDirectiveMemberDto,
        areaId: 0,
      }),
    ).rejects.toMatchObject({
      message: 'Area with ID 0 not found',
    });
    expect(areasRepository.exists).toHaveBeenCalledWith({
      where: { id: 0, isArchived: false },
    });
    expect(skillsRepository.find).not.toHaveBeenCalled();
    expect(membersRepository.create).not.toHaveBeenCalled();
  });

  it('creates and persists an external member without student code', async () => {
    const externalSkills: Skill[] = [createSkill(3, 'facilitacion')];
    const persistedMember: Member = {
      id: 2,
      institution: 'PUCP',
      studentCode: null,
      firstNames: 'Lucia',
      lastNames: 'Campos Rivera',
      major: 'Diseno',
      birthDate: '2001-09-10',
      cycle: null,
      activityStatus: MemberActivityStatus.ACTIVE,
      availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      skills: externalSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [],
      projectMemberships: [],
      get role(): AreaRole {
        return AreaRole.MIEMBRO;
      },
      get areaId(): number | null {
        return null;
      },
    } as Member;

    skillsRepository.find?.mockResolvedValue(externalSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(externalMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(membersRepository.create).toHaveBeenCalledWith({
      institution: externalMemberDto.institution,
      firstNames: externalMemberDto.firstNames,
      lastNames: externalMemberDto.lastNames,
      major: externalMemberDto.major,
      birthDate: externalMemberDto.birthDate,
      role: externalMemberDto.role,
      skills: externalSkills,
    });
    expect(membersRepository.save).toHaveBeenCalledWith(persistedMember);
    expect(areaMembershipsRepository.create).toHaveBeenCalledWith({
      member: persistedMember,
      area: null,
      role: AreaRole.MIEMBRO,
    });
  });

  it('supports legacy status input mapping to availabilityStatus when creating a member', async () => {
    const externalSkills: Skill[] = [createSkill(3, 'facilitacion')];
    const createDto = {
      ...externalMemberDto,
      status: MemberAvailabilityStatus.DISABLED,
    };
    const persistedMember = {
      ...persistedAreaDirectiveMember,
      institution: createDto.institution,
      studentCode: null,
      availabilityStatus: MemberAvailabilityStatus.DISABLED,
    };

    skillsRepository.find?.mockResolvedValue(externalSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(createDto)).resolves.toEqual(persistedMember);
    expect(membersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        availabilityStatus: MemberAvailabilityStatus.DISABLED,
      }),
    );
  });

  it('raises a conflict when the institution and student code already exist', async () => {
    const driverError: Error & { code: string } = Object.assign(
      new Error('duplicate key value'),
      { code: '23505' },
    );
    const duplicateError = new QueryFailedError(
      'INSERT INTO members',
      [],
      driverError,
    );

    areasRepository.exists?.mockResolvedValue(true);
    skillsRepository.find?.mockResolvedValue(persistedSkills);
    membersRepository.create?.mockReturnValue(persistedAreaDirectiveMember);
    membersRepository.save?.mockRejectedValue(duplicateError);

    await expect(service.create(areaDirectiveMemberDto)).rejects.toMatchObject({
      message:
        'A member with institution "UNI" and student code "20230001" already exists.',
    });
  });

  describe('findAll', () => {
    let queryBuilderMock: ReturnType<typeof createQueryBuilderMock>;
    const storedMembers: Member[] = [
      {
        id: 2,
        institution: 'UNI',
        studentCode: '20230011',
        firstNames: 'Bruno',
        lastNames: 'Alva Ruiz',
        major: 'Arquitectura',
        birthDate: '2003-10-02',
        cycle: null,
        activityStatus: MemberActivityStatus.ACTIVE,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
        skills: [createSkill(4, 'gestion')],
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [],
        projectMemberships: [],
        get role(): AreaRole {
          return AreaRole.MIEMBRO;
        },
        get areaId(): number | null {
          return 3;
        },
      } as Member,
    ];

    beforeEach(() => {
      queryBuilderMock = createQueryBuilderMock(storedMembers);

      membersRepository.createQueryBuilder?.mockReturnValue(queryBuilderMock);
    });

    it('lists members ordered by last name and first name', async () => {
      await expect(service.findAll()).resolves.toEqual(storedMembers);
      expect(membersRepository.createQueryBuilder).toHaveBeenCalledWith(
        'member',
      );
      expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
        'member.skills',
        'skill',
      );
      expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
        'member.memberships',
        'membership',
      );
      expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
        'membership.area',
        'area',
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'member.lastNames',
        'ASC',
      );
      expect(queryBuilderMock.getMany).toHaveBeenCalled();
    });

    it('filters by availabilityStatus', async () => {
      const filterDto = {
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      };
      await expect(service.findAll(filterDto)).resolves.toEqual(storedMembers);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'member.availabilityStatus = :availabilityStatus',
        { availabilityStatus: MemberAvailabilityStatus.AVAILABLE },
      );
    });

    it('filters by areaId', async () => {
      const filterDto = { areaId: 5 };
      await expect(service.findAll(filterDto)).resolves.toEqual(storedMembers);
      expect(queryBuilderMock.innerJoin).toHaveBeenCalledWith(
        'member.memberships',
        'areaMembershipFilter',
        'areaMembershipFilter.areaId = :areaId',
        { areaId: 5 },
      );
      expect(queryBuilderMock.andWhere).not.toHaveBeenCalledWith(
        'area.id = :areaId',
        expect.anything(),
      );
    });

    it('filters by skills', async () => {
      const filterDto = { skills: ['typescript', 'testing'] };
      await expect(service.findAll(filterDto)).resolves.toEqual(storedMembers);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(queryBuilderMock.setParameter).toHaveBeenCalledWith('skills', [
        'typescript',
        'testing',
      ]);
    });

    it('filters by combination of status, areaId, and skills', async () => {
      const filterDto = {
        areaId: 3,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
        skills: ['typescript'],
      };
      await expect(service.findAll(filterDto)).resolves.toEqual(storedMembers);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'member.availabilityStatus = :availabilityStatus',
        { availabilityStatus: MemberAvailabilityStatus.AVAILABLE },
      );
      expect(queryBuilderMock.innerJoin).toHaveBeenCalledWith(
        'member.memberships',
        'areaMembershipFilter',
        'areaMembershipFilter.areaId = :areaId',
        { areaId: 3 },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(queryBuilderMock.setParameter).toHaveBeenCalledWith('skills', [
        'typescript',
      ]);
    });
  });

  describe('update', () => {
    it('updates editable profile fields and skills', async () => {
      const updatedSkill = createSkill(3, 'nestjs');
      const updateDto = {
        firstNames: 'Ana',
        lastNames: 'Rojas',
        major: 'Ingenieria de Software',
        birthDate: '2004-05-20',
        skills: ['nestjs'],
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      skillsRepository.find?.mockResolvedValue([updatedSkill]);
      membersRepository.save?.mockImplementation((member: Member) =>
        Promise.resolve(member),
      );

      await expect(service.update(10, updateDto)).resolves.toEqual(
        expect.objectContaining({
          firstNames: 'Ana',
          lastNames: 'Rojas',
          major: 'Ingenieria de Software',
          birthDate: '2004-05-20',
          skills: [updatedSkill],
        }),
      );
      expect(skillsRepository.find).toHaveBeenCalledWith({
        where: { name: In(['nestjs']) },
      });
    });

    it('successfully updates a member availability status', async () => {
      const updateDto = {
        availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
      };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
        }),
      );
      expect(areaMembershipsRepository.findOne).not.toHaveBeenCalled();
    });

    it('supports legacy status update input as availability status', async () => {
      const updateDto = { status: MemberAvailabilityStatus.NOT_AVAILABLE };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.update(10, updateDto as any),
      ).resolves.toEqual(updatedMember);
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
        }),
      );
    });

    it('successfully updates a member cycle', async () => {
      const updateDto = { cycle: 5 };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        cycle: 5,
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cycle: 5,
        }),
      );
    });

    it('successfully reactivates a member', async () => {
      const updateDto = {
        activityStatus: MemberActivityStatus.ACTIVE,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      };
      const reactivatedMember = {
        ...persistedAreaDirectiveMember,
        activityStatus: MemberActivityStatus.ACTIVE,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(reactivatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        reactivatedMember,
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          activityStatus: MemberActivityStatus.ACTIVE,
          availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
        }),
      );
    });

    it('successfully updates a member activity status', async () => {
      const updateDto = { activityStatus: MemberActivityStatus.INACTIVE };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        activityStatus: MemberActivityStatus.INACTIVE,
      };

      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          activityStatus: MemberActivityStatus.INACTIVE,
        }),
      );
    });

    it('throws NotFoundException when updating to an unknown or archived area', async () => {
      const updateDto = { areaId: 999 };

      areasRepository.exists?.mockResolvedValue(false);

      await expect(service.update(10, updateDto)).rejects.toThrow(
        new NotFoundException('Area with ID 999 not found'),
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 999, isArchived: false },
      });
      expect(membersRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when member to update does not exist', async () => {
      const updateDto = {
        availabilityStatus: MemberAvailabilityStatus.DISABLED,
      };

      membersRepository.findOne?.mockResolvedValue(null);

      await expect(service.update(99, updateDto)).rejects.toThrow(
        new NotFoundException('Member with ID 99 not found'),
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 99 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('successfully unassigns area when areaId is null', async () => {
      const updateDto = { areaId: null };
      const updatedMember = { ...persistedAreaDirectiveMember };

      const mockMembership = {
        id: 50,
        memberId: 10,
        role: AreaRole.DIRECTIVA_DE_AREA,
      };
      areaMembershipsRepository.findOne?.mockResolvedValue(mockMembership);
      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        persistedAreaDirectiveMember,
      );
      expect(areaMembershipsRepository.findOne).toHaveBeenCalledWith({
        where: {
          member: { id: 10 },
          role: AreaRole.DIRECTIVA_DE_AREA,
        },
        order: { id: 'ASC' },
      });
      expect(areaMembershipsRepository.remove).toHaveBeenCalledWith(
        mockMembership,
      );
    });

    it('successfully updates area when areaId is a valid existing area', async () => {
      const updateDto = { areaId: 5 };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
      };

      const mockMembership = {
        id: 50,
        memberId: 10,
        role: AreaRole.DIRECTIVA_DE_AREA,
        area: { id: 3 },
      };
      areaMembershipsRepository.findOne?.mockResolvedValue(mockMembership);
      areasRepository.exists?.mockResolvedValue(true);
      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 5, isArchived: false },
      });
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        persistedAreaDirectiveMember,
      );
      expect(areaMembershipsRepository.findOne).toHaveBeenCalledWith({
        where: {
          member: { id: 10 },
          role: AreaRole.DIRECTIVA_DE_AREA,
        },
        order: { id: 'ASC' },
      });
      expect(areaMembershipsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 50,
          area: { id: 5 },
        }),
      );
    });

    it('targets DIRECTIVA_DE_AREA membership when member is PRESIDENCIA and also has a DIRECTIVA_DE_AREA membership', async () => {
      const updateDto = { areaId: 5 };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
      };

      const mockDirectiveMembership = {
        id: 50,
        memberId: 10,
        role: AreaRole.DIRECTIVA_DE_AREA,
        area: { id: 3 },
      };

      const memberWithBothMemberships = {
        ...persistedAreaDirectiveMember,
        memberships: [
          { id: 49, memberId: 10, role: AreaRole.PRESIDENCIA, area: null },
          mockDirectiveMembership,
        ],
      } as unknown as Member;

      areaMembershipsRepository.findOne?.mockResolvedValue(
        mockDirectiveMembership,
      );
      areasRepository.exists?.mockResolvedValue(true);
      membersRepository.findOne?.mockResolvedValue(memberWithBothMemberships);
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 5, isArchived: false },
      });
      expect(areaMembershipsRepository.findOne).toHaveBeenCalledWith({
        where: {
          member: { id: 10 },
          role: AreaRole.DIRECTIVA_DE_AREA,
        },
        order: { id: 'ASC' },
      });
      expect(areaMembershipsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 50,
          area: { id: 5 },
        }),
      );
    });

    it('creates a new DIRECTIVA_DE_AREA membership when member has only PRESIDENCIA membership and areaId is set', async () => {
      const updateDto = { areaId: 5 };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
      };

      const presidenciaMember = {
        ...persistedAreaDirectiveMember,
        memberships: [
          { id: 49, memberId: 10, role: AreaRole.PRESIDENCIA, area: null },
        ],
      } as unknown as Member;

      areaMembershipsRepository.findOne?.mockResolvedValue(null);
      areasRepository.exists?.mockResolvedValue(true);
      membersRepository.findOne?.mockResolvedValue(presidenciaMember);
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 5, isArchived: false },
      });
      expect(areaMembershipsRepository.create).toHaveBeenCalledWith({
        member: updatedMember,
        area: { id: 5 },
        role: AreaRole.DIRECTIVA_DE_AREA,
      });
      expect(areaMembershipsRepository.save).toHaveBeenCalled();
    });
  });

  it('lists only members from the assigned area for Directiva de Area', async () => {
    const scopedMembers: Member[] = [persistedAreaDirectiveMember];
    const queryBuilderMock = createQueryBuilderMock(scopedMembers);

    membersRepository.createQueryBuilder?.mockReturnValue(
      queryBuilderMock as any,
    );

    await expect(
      service.findAccessible(
        {
          role: AreaRole.DIRECTIVA_DE_AREA,
          areaId: '3',
        },
        { areaId: 99, availabilityStatus: MemberAvailabilityStatus.AVAILABLE },
      ),
    ).resolves.toEqual(
      scopedMembers.map((m) => toMemberResponse(m, AreaRole.DIRECTIVA_DE_AREA)),
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'member.availabilityStatus = :availabilityStatus',
      { availabilityStatus: MemberAvailabilityStatus.AVAILABLE },
    );
    expect(queryBuilderMock.innerJoin).toHaveBeenCalledWith(
      'member.memberships',
      'areaMembershipFilter',
      'areaMembershipFilter.areaId = :areaId',
      { areaId: 3 },
    );
  });

  it('rejects member listing for Miembro until project persistence exists', async () => {
    await expect(
      service.findAccessible({
        role: AreaRole.MIEMBRO,
        projectIds: ['project-1'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('deactivate', () => {
    it('deactivates a member for Presidencia with an exact full name', async () => {
      const deactivatedMember = {
        ...persistedAreaDirectiveMember,
        activityStatus: MemberActivityStatus.INACTIVE,
        availabilityStatus: MemberAvailabilityStatus.DISABLED,
      };
      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );
      membersRepository.save?.mockResolvedValue(deactivatedMember);

      await expect(
        service.deactivate(10, 'Ana Lucia Rojas Perez', {
          role: AreaRole.PRESIDENCIA,
        }),
      ).resolves.toEqual(deactivatedMember);
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['memberships'],
      });
      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          activityStatus: MemberActivityStatus.INACTIVE,
          availabilityStatus: MemberAvailabilityStatus.DISABLED,
        }),
      );
    });

    it('allows Directiva de Area to deactivate a member in its own area', async () => {
      const member = {
        ...persistedAreaDirectiveMember,
        areaId: null,
        memberships: [{ areaId: 3 } as AreaMembership],
      };
      const deactivatedMember = {
        ...member,
        activityStatus: MemberActivityStatus.INACTIVE,
        availabilityStatus: MemberAvailabilityStatus.DISABLED,
      };
      membersRepository.findOne?.mockResolvedValue(member);
      membersRepository.save?.mockResolvedValue(deactivatedMember);

      await expect(
        service.deactivate(10, 'Ana Lucia Rojas Perez', {
          role: AreaRole.DIRECTIVA_DE_AREA,
          areaId: '3',
        }),
      ).resolves.toEqual(deactivatedMember);
    });

    it('rejects Directiva de Area deactivating a member from another area', async () => {
      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );

      await expect(
        service.deactivate(10, 'Ana Lucia Rojas Perez', {
          role: AreaRole.DIRECTIVA_DE_AREA,
          areaId: '9',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('rejects member deactivation when confirmName does not exactly match', async () => {
      membersRepository.findOne?.mockResolvedValue(
        persistedAreaDirectiveMember,
      );

      await expect(
        service.deactivate(10, 'ana lucia rojas perez', {
          role: AreaRole.PRESIDENCIA,
        }),
      ).rejects.toThrow('confirmName must exactly match the member full name');
      expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('rejects deactivation for a missing member', async () => {
      membersRepository.findOne?.mockResolvedValue(null);

      await expect(
        service.deactivate(99, 'Missing Member', {
          role: AreaRole.PRESIDENCIA,
        }),
      ).rejects.toThrow(new NotFoundException('Member with ID 99 not found'));
      expect(membersRepository.save).not.toHaveBeenCalled();
    });
  });
});
