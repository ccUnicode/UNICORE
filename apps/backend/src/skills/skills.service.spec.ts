import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './skill.entity';
import { SkillsService } from './skills.service';

type RepositoryMock = Partial<Record<keyof Repository<Skill>, jest.Mock>>;

describe('SkillsService', () => {
  let service: SkillsService;
  let repository: RepositoryMock;

  const createSkillDto: CreateSkillDto = {
    name: 'react',
  };

  const skillEntity: Skill = {
    id: 1,
    name: 'react',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    members: [],
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        {
          provide: getRepositoryToken(Skill),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and returns a skill', async () => {
      repository.create!.mockReturnValue(skillEntity);
      repository.save!.mockResolvedValue(skillEntity);

      const result = await service.create(createSkillDto);

      expect(repository.create).toHaveBeenCalledWith(createSkillDto);
      expect(repository.save).toHaveBeenCalledWith(skillEntity);
      expect(result).toEqual(skillEntity);
    });

    it('throws ConflictException when the skill name already exists', async () => {
      const driverError: Error & { code: string } = Object.assign(
        new Error('duplicate key value'),
        { code: '23505' },
      );

      repository.create!.mockReturnValue(skillEntity);
      repository.save!.mockRejectedValue(
        new QueryFailedError('INSERT INTO skills ...', [], driverError),
      );

      await expect(service.create(createSkillDto)).rejects.toThrow(
        new ConflictException(
          `A skill with name "${createSkillDto.name}" already exists.`,
        ),
      );
    });

    it('rethrows non-duplicate database errors', async () => {
      const driverError: Error & { code: string } = Object.assign(
        new Error('unexpected database error'),
        { code: '99999' },
      );
      const databaseError = new QueryFailedError(
        'INSERT INTO skills ...',
        [],
        driverError,
      );

      repository.create!.mockReturnValue(skillEntity);
      repository.save!.mockRejectedValue(databaseError);

      await expect(service.create(createSkillDto)).rejects.toThrow(databaseError);
    });
  });

  describe('findAll', () => {
    it('returns all skills ordered by name and createdAt', async () => {
      const skills: Skill[] = [
        skillEntity,
        {
          id: 2,
          name: 'typescript',
          createdAt: new Date('2026-03-30T11:00:00.000Z'),
          updatedAt: new Date('2026-03-30T11:00:00.000Z'),
          members: [],
        },
      ];

      repository.find!.mockResolvedValue(skills);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: {
          name: 'ASC',
          createdAt: 'ASC',
        },
      });
      expect(result).toEqual(skills);
    });
  });
});
