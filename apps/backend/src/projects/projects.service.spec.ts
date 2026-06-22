import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { Area } from '../area/entities/area.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

type ProjectRepositoryMock = Partial<
  Record<keyof Repository<Project>, jest.Mock>
>;

const createArea = (overrides: Partial<Area> = {}): Area => ({
  id: 1,
  name: 'Tecnologia',
  description: null,
  isArchived: false,
  memberships: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createProject = (overrides: Partial<Project> = {}): Project => {
  const area = overrides.area ?? createArea();

  return {
    id: 1,
    name: 'Portal de miembros',
    description: 'Proyecto base',
    startDate: '2026-06-01',
    endDate: '2026-07-01',
    areaId: area.id,
    area,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: ProjectRepositoryMock;

  const mockAreaService = {
    findOne: jest.fn(),
  };

  const createProjectDto: CreateProjectDto = {
    name: 'Portal de miembros',
    description: 'Proyecto base',
    startDate: '2026-06-01',
    endDate: '2026-07-01',
    areaId: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    projectsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: AreaService,
          useValue: mockAreaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('creates a project when the area exists', async () => {
    const area = createArea();
    const project = createProject({ area });

    mockAreaService.findOne.mockResolvedValue(area);
    projectsRepository.create?.mockReturnValue(project);
    projectsRepository.save?.mockResolvedValue(project);

    await expect(service.create(createProjectDto)).resolves.toEqual(project);
    expect(mockAreaService.findOne).toHaveBeenCalledWith(1);
    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: createProjectDto.name,
      description: createProjectDto.description,
      startDate: createProjectDto.startDate,
      endDate: createProjectDto.endDate,
      areaId: area.id,
      area,
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(project);
  });

  it('stores nullable optional fields when they are omitted', async () => {
    const area = createArea();
    const project = createProject({
      description: null,
      startDate: null,
      endDate: null,
      area,
    });

    mockAreaService.findOne.mockResolvedValue(area);
    projectsRepository.create?.mockReturnValue(project);
    projectsRepository.save?.mockResolvedValue(project);

    await expect(
      service.create({
        name: 'Proyecto sin fechas',
        areaId: 1,
      }),
    ).resolves.toEqual(project);
    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'Proyecto sin fechas',
      description: null,
      startDate: null,
      endDate: null,
      areaId: area.id,
      area,
    });
  });

  it('propagates NotFoundException when the area does not exist', async () => {
    mockAreaService.findOne.mockRejectedValue(
      new NotFoundException('Area with ID "99" not found'),
    );

    await expect(
      service.create({
        ...createProjectDto,
        areaId: 99,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(projectsRepository.create).not.toHaveBeenCalled();
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects projects with an end date before the start date', async () => {
    await expect(
      service.create({
        ...createProjectDto,
        startDate: '2026-07-01',
        endDate: '2026-06-01',
      }),
    ).rejects.toThrow(
      new BadRequestException('startDate must be before or equal to endDate'),
    );
    expect(mockAreaService.findOne).not.toHaveBeenCalled();
  });

  it('lists projects with pagination metadata', async () => {
    const projects = [createProject({ id: 1 }), createProject({ id: 2 })];

    projectsRepository.findAndCount?.mockResolvedValue([projects, 12]);

    await expect(service.findAll({ page: 2, limit: 5 })).resolves.toEqual({
      data: projects,
      meta: {
        total: 12,
        page: 2,
        limit: 5,
        lastPage: 3,
      },
    });
    expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
      relations: ['area'],
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
  });

  it('uses default pagination values', async () => {
    projectsRepository.findAndCount?.mockResolvedValue([[], 0]);

    await expect(service.findAll()).resolves.toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        lastPage: 0,
      },
    });
    expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
      relations: ['area'],
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });
});
