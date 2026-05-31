import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';
import { Skill } from '../skills/skill.entity';
import { MembersService } from './members.service';

type MemberRepositoryMock = Partial<
  Record<keyof Repository<Member>, jest.Mock>
>;
type SkillRepositoryMock = Partial<Record<keyof Repository<Skill>, jest.Mock>>;

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

describe('MembersService', () => {
  let service: MembersService;
  let membersRepository: MemberRepositoryMock;
  let skillsRepository: SkillRepositoryMock;
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
    };
    skillsRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
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
    };
  });

  it('creates and persists an area directive member', async () => {
    skillsRepository.find?.mockResolvedValue(persistedSkills);
    membersRepository.create?.mockReturnValue(persistedAreaDirectiveMember);
    membersRepository.save?.mockResolvedValue(persistedAreaDirectiveMember);

    await expect(service.create(areaDirectiveMemberDto)).resolves.toEqual(
      persistedAreaDirectiveMember,
    );
    expect(membersRepository.create).toHaveBeenCalledWith({
      ...areaDirectiveMemberDto,
      skills: persistedSkills,
    });
    expect(membersRepository.save).toHaveBeenCalledWith(
      persistedAreaDirectiveMember,
    );
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
      role: externalMemberDto.role,
      areaId: null,
      area: null,
      skills: externalSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    skillsRepository.find?.mockResolvedValue(externalSkills);
    membersRepository.create?.mockReturnValue(persistedMember);
    membersRepository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(externalMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(membersRepository.create).toHaveBeenCalledWith({
      ...externalMemberDto,
      areaId: null,
      skills: externalSkills,
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
      },
    ];

    membersRepository.find?.mockResolvedValue(storedMembers);

    await expect(service.findAll()).resolves.toEqual(storedMembers);
    expect(membersRepository.find).toHaveBeenCalledWith({
      relations: {
        skills: true,
      },
      order: {
        lastNames: 'ASC',
        firstNames: 'ASC',
        createdAt: 'ASC',
      },
    });
  });

  it('lists only members from the assigned area for Directiva de Area', async () => {
    const scopedMembers: Member[] = [persistedAreaDirectiveMember];

    membersRepository.find?.mockResolvedValue(scopedMembers);

    await expect(
      service.findAccessible({
        role: AreaRole.DIRECTIVA_DE_AREA,
        areaId: '3',
      }),
    ).resolves.toEqual(scopedMembers);
    expect(membersRepository.find).toHaveBeenCalledWith({
      where: {
        areaId: 3,
      },
      relations: {
        skills: true,
      },
      order: {
        lastNames: 'ASC',
        firstNames: 'ASC',
        createdAt: 'ASC',
      },
    });
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
