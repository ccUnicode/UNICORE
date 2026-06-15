import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { Skill } from '../skills/skill.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member, MemberStatus } from './member.entity';
import { MembersService } from './members.service';

type MemberRepositoryMock = Partial<
  Record<keyof Repository<Member>, jest.Mock>
>;
type SkillRepositoryMock = Partial<Record<keyof Repository<Skill>, jest.Mock>>;
type AreaRepositoryMock = Partial<Record<keyof Repository<Area>, jest.Mock>>;

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
      role: areaDirectiveMemberDto.role,
      areaId: areaDirectiveMemberDto.areaId ?? null,
      area: null,
      skills: persistedSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: MemberStatus.Available,
    };
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
      where: { id: 3 },
    });
    expect(skillsRepository.find).toHaveBeenCalledWith({
      where: {
        name: expect.anything() as unknown,
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
      area: { id: areaDirectiveMemberDto.areaId },
    });
    expect(membersRepository.save).toHaveBeenCalledWith(
      persistedAreaDirectiveMember,
    );
  });

  it('rejects an unknown area id when creating a member', async () => {
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
      where: { id: 0 },
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
      role: AreaRole.MIEMBRO,
      areaId: null,
      area: null,
      skills: externalSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: MemberStatus.Available,
    };

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
      area: undefined,
    });
    expect(membersRepository.save).toHaveBeenCalledWith(persistedMember);
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

  it('lists members ordered by last name and first name', async () => {
    const storedMembers: Member[] = [
      {
        id: 2,
        institution: 'UNI',
        studentCode: '20230011',
        firstNames: 'Bruno',
        lastNames: 'Alva Ruiz',
        major: 'Arquitectura',
        birthDate: '2003-10-02',
        role: AreaRole.MIEMBRO,
        areaId: 3,
        area: null,
        skills: [createSkill(4, 'gestion')],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: MemberStatus.Available,
      },
    ];
    const queryBuilderMock = createQueryBuilderMock(storedMembers);

    membersRepository.createQueryBuilder?.mockReturnValue(
      queryBuilderMock as any,
    );

    await expect(service.findAll()).resolves.toEqual(storedMembers);
    expect(membersRepository.createQueryBuilder).toHaveBeenCalledWith('member');
    expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
      'member.skills',
      'skill',
    );
    expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
      'member.area',
      'area',
    );
    expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
      'member.lastNames',
      'ASC',
    );
    expect(queryBuilderMock.getMany).toHaveBeenCalled();
  });

  describe('update', () => {
    it('successfully updates a member status', async () => {
      const updateDto = { status: MemberStatus.Unavailable };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        status: MemberStatus.Unavailable,
      };

      membersRepository.preload?.mockResolvedValue(updatedMember);
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.preload).toHaveBeenCalledWith({
        id: 10,
        status: MemberStatus.Unavailable,
      });
      expect(membersRepository.save).toHaveBeenCalledWith(updatedMember);
    });

    it('throws NotFoundException when updating with a non-existent areaId', async () => {
      const updateDto = { areaId: 999 };

      areasRepository.exists?.mockResolvedValue(false);

      await expect(service.update(10, updateDto)).rejects.toThrow(
        new NotFoundException('Area with ID 999 not found'),
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(membersRepository.preload).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when member to update does not exist', async () => {
      const updateDto = { status: MemberStatus.Disabled };

      membersRepository.preload?.mockResolvedValue(null);

      await expect(service.update(99, updateDto)).rejects.toThrow(
        new NotFoundException('Member with ID 99 not found'),
      );
      expect(membersRepository.preload).toHaveBeenCalledWith({
        id: 99,
        status: MemberStatus.Disabled,
      });
      expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('successfully unassigns area when areaId is null', async () => {
      const updateDto = { areaId: null };
      const updatedMember = { ...persistedAreaDirectiveMember, area: null };

      membersRepository.preload?.mockResolvedValue(updatedMember);
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(membersRepository.preload).toHaveBeenCalledWith({
        id: 10,
        area: null,
      });
      expect(membersRepository.save).toHaveBeenCalledWith(updatedMember);
    });

    it('successfully updates area when areaId is a valid existing area', async () => {
      const updateDto = { areaId: 5 };
      const updatedMember = {
        ...persistedAreaDirectiveMember,
        area: { id: 5 } as Area,
      };

      areasRepository.exists?.mockResolvedValue(true);
      membersRepository.preload?.mockResolvedValue(updatedMember);
      membersRepository.save?.mockResolvedValue(updatedMember);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedMember,
      );
      expect(areasRepository.exists).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(membersRepository.preload).toHaveBeenCalledWith({
        id: 10,
        area: { id: 5 },
      });
      expect(membersRepository.save).toHaveBeenCalledWith(updatedMember);
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
        { areaId: 99, status: MemberStatus.Available },
      ),
    ).resolves.toEqual(scopedMembers);
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'member.status = :status',
      { status: MemberStatus.Available },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'area.id = :areaId',
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
});
