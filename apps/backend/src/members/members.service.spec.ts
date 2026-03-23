import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';
import { MembersService } from './members.service';

type RepositoryMock = Partial<Record<keyof Repository<Member>, jest.Mock>>;

describe('MembersService', () => {
  let service: MembersService;
  let repository: RepositoryMock;
  let persistedMember: Member;

  const createMemberDto: CreateMemberDto = {
    institution: 'UNI',
    studentCode: '20230001',
    firstNames: 'Ana Lucia',
    lastNames: 'Rojas Perez',
    major: 'Ingenieria de Sistemas',
    birthDate: '2004-04-18',
    skills: ['TypeScript', 'Testing'],
  };

  const externalMemberDto: CreateMemberDto = {
    institution: 'PUCP',
    firstNames: 'Lucia',
    lastNames: 'Campos Rivera',
    major: 'Diseno',
    birthDate: '2001-09-10',
    skills: ['Facilitacion'],
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: getRepositoryToken(Member),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    persistedMember = {
      id: 1,
      institution: createMemberDto.institution,
      studentCode: createMemberDto.studentCode ?? null,
      firstNames: createMemberDto.firstNames,
      lastNames: createMemberDto.lastNames,
      major: createMemberDto.major,
      birthDate: createMemberDto.birthDate,
      skills: createMemberDto.skills,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('creates and persists a member', async () => {
    repository.create?.mockReturnValue(persistedMember);
    repository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(createMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(repository.create).toHaveBeenCalledWith(createMemberDto);
    expect(repository.save).toHaveBeenCalledWith(persistedMember);
  });

  it('creates and persists an external member without student code', async () => {
    const persistedMember: Member = {
      id: 2,
      institution: 'PUCP',
      studentCode: null,
      firstNames: 'Lucia',
      lastNames: 'Campos Rivera',
      major: 'Diseno',
      birthDate: '2001-09-10',
      skills: ['Facilitacion'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.create?.mockReturnValue(persistedMember);
    repository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(externalMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(repository.create).toHaveBeenCalledWith(externalMemberDto);
    expect(repository.save).toHaveBeenCalledWith(persistedMember);
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

    repository.create?.mockReturnValue(persistedMember);
    repository.save?.mockRejectedValue(duplicateError);

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
        skills: ['Gestion'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    repository.find?.mockResolvedValue(storedMembers);

    await expect(service.findAll()).resolves.toEqual(storedMembers);
    expect(repository.find).toHaveBeenCalledWith({
      order: {
        lastNames: 'ASC',
        firstNames: 'ASC',
        createdAt: 'ASC',
      },
    });
  });
});
