import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';
import { Skill } from '../skills/skill.entity';
import { MembersService } from './members.service';
import { Area } from '../area/entities/area.entity';

type MemberRepositoryMock = Partial<
  Record<keyof Repository<Member>, jest.Mock>
>;
type SkillRepositoryMock = Partial<Record<keyof Repository<Skill>, jest.Mock>>;
type AreaRepositoryMock = Partial<Record<keyof Repository<Area>, jest.Mock>>;

describe('MembersService', () => {
  let service: MembersService;
  let membersRepository: MemberRepositoryMock;
  let skillsRepository: SkillRepositoryMock;
  let areasRepository: AreaRepositoryMock;
  let persistedMember: Member;
  let persistedSkills: Skill[];

  const createMemberDto: CreateMemberDto = {
    institution: 'UNI',
    studentCode: '20230001',
    firstNames: 'Ana Lucia',
    lastNames: 'Rojas Perez',
    major: 'Ingenieria de Sistemas',
    birthDate: '2004-04-18',
    skills: ['typescript', 'testing'],
  };

  const externalMemberDto: CreateMemberDto = {
    institution: 'PUCP',
    firstNames: 'Lucia',
    lastNames: 'Campos Rivera',
    major: 'Diseno',
    birthDate: '2001-09-10',
    skills: ['facilitacion'],
  };

  beforeEach(async () => {
    membersRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
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
    persistedSkills = [
      {
        id: 1,
        name: 'typescript',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [] as any,
      },
      {
        id: 2,
        name: 'testing',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [] as any,
      },
    ];
    persistedMember = {
      id: 10,
      institution: createMemberDto.institution,
      studentCode: createMemberDto.studentCode ?? null,
      firstNames: createMemberDto.firstNames,
      lastNames: createMemberDto.lastNames,
      major: createMemberDto.major,
      birthDate: createMemberDto.birthDate,
      skills: persistedSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Available' as any,
      area: null as any,
    };
  });

  it('creates and persists a member', async () => {
    skillsRepository.find?.mockResolvedValue(persistedSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(createMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(skillsRepository.find).toHaveBeenCalledWith({
      where: {
        name: expect.anything(),
      },
    });
    const { skills, areaId, ...restDto } = createMemberDto as any;
    expect(membersRepository.create).toHaveBeenCalledWith({
      ...restDto,
      skills: persistedSkills,
      area: undefined,
    });
    expect(membersRepository.save).toHaveBeenCalledWith(persistedMember);
  });

  it('rejects an unknown area id when creating a member', async () => {
    areasRepository.exists?.mockResolvedValue(false);

    await expect(
      service.create({
        ...createMemberDto,
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
    const externalSkills: Skill[] = [
      {
        id: 3,
        name: 'facilitacion',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [] as any,
      },
    ];
    const persistedMember: Member = {
      id: 2,
      institution: 'PUCP',
      studentCode: null,
      firstNames: 'Lucia',
      lastNames: 'Campos Rivera',
      major: 'Diseno',
      birthDate: '2001-09-10',
      skills: externalSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Available' as any,
      area: null as any,
    };

    skillsRepository.find?.mockResolvedValue(externalSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(externalMemberDto)).resolves.toEqual(
      persistedMember,
    );
    const { skills, areaId, ...restDto } = externalMemberDto as any;
    expect(membersRepository.create).toHaveBeenCalledWith({
      ...restDto,
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

    skillsRepository.find?.mockResolvedValue(persistedSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockRejectedValue(duplicateError);

    await expect(service.create(createMemberDto)).rejects.toMatchObject({
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
        skills: [
          {
            id: 4,
            name: 'gestion',
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [] as any,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'Available' as any,
        area: null as any,
      },
    ];

    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(storedMembers),
    };

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
});
