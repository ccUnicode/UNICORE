import { ConflictException } from '@nestjs/common';
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

  const createMemberDto: CreateMemberDto = {
    uniCode: '20230001',
    firstNames: 'Ana Lucia',
    lastNames: 'Rojas Perez',
    major: 'Ingenieria de Sistemas',
    birthDate: '2004-04-18',
    skills: ['TypeScript', 'Testing'],
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
  });

  it('creates and persists a member', async () => {
    const persistedMember: Member = {
      id: 1,
      ...createMemberDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.create?.mockReturnValue(persistedMember);
    repository.save?.mockResolvedValue(persistedMember);

    await expect(service.create(createMemberDto)).resolves.toEqual(
      persistedMember,
    );
    expect(repository.create).toHaveBeenCalledWith(createMemberDto);
    expect(repository.save).toHaveBeenCalledWith(persistedMember);
  });

  it('raises a conflict when the UNI code already exists', async () => {
    const error = new Error() as any;
    error.code = '23505';
    const duplicateError = new QueryFailedError(
      'INSERT INTO members',
      [],
      error,
    );

    repository.create?.mockReturnValue(createMemberDto);
    repository.save?.mockRejectedValue(duplicateError);

    await expect(service.create(createMemberDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lists members ordered by last name and first name', async () => {
    const storedMembers: Member[] = [
      {
        id: 2,
        uniCode: '20230011',
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
