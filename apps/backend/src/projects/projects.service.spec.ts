import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { Area } from '../area/entities/area.entity';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

type RepositoryMethodMocks<T extends ObjectLiteral> = Partial<
  Record<Exclude<keyof Repository<T>, 'manager'>, jest.Mock>
>;

type ProjectRepositoryMock = RepositoryMethodMocks<Project> & {
  manager: {
    transaction: jest.Mock;
  };
};
type ProjectPhaseRepositoryMock = RepositoryMethodMocks<ProjectPhase> & {
  manager: {
    transaction: jest.Mock;
  };
};

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

const createProjectPhase = (
  overrides: Partial<ProjectPhase> = {},
): ProjectPhase => ({
  id: 1,
  name: 'Planning',
  description: null,
  orderIndex: 1,
  projectId: 1,
  project: {} as Project,
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
    phases: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: ProjectRepositoryMock;
  let projectPhasesRepository: ProjectPhaseRepositoryMock;

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
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };
    projectPhasesRepository = {
      create: jest.fn((phase: Partial<ProjectPhase>) =>
        createProjectPhase(phase),
      ),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };
    const getRepository = jest.fn(
      (entity: typeof Project | typeof ProjectPhase) =>
        entity === Project ? projectsRepository : projectPhasesRepository,
    );
    const transaction = jest.fn(
      async (
        callback: (entityManager: {
          getRepository: typeof getRepository;
        }) => Promise<unknown>,
      ) => callback({ getRepository }),
    );
    projectsRepository.manager.transaction = transaction;
    projectPhasesRepository.manager.transaction = transaction;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: projectPhasesRepository,
        },
        {
          provide: AreaService,
          useValue: mockAreaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('creates a project with default phases when the area exists', async () => {
    const area = createArea();
    const project = createProject({ area });
    const phases = DEFAULT_PROJECT_PHASES.map((name, index) =>
      createProjectPhase({ id: index + 1, name, orderIndex: index + 1 }),
    );

    mockAreaService.findOne.mockResolvedValue(area);
    projectsRepository.create?.mockReturnValue(project);
    projectsRepository.save?.mockResolvedValue(project);
    projectPhasesRepository.save?.mockResolvedValue(phases);

    await expect(service.create(createProjectDto)).resolves.toEqual({
      ...project,
      phases,
    });
    expect(mockAreaService.findOne).toHaveBeenCalledWith(1);
    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: createProjectDto.name,
      description: createProjectDto.description,
      startDate: createProjectDto.startDate,
      endDate: createProjectDto.endDate,
      areaId: area.id,
      area,
    });
    expect(projectPhasesRepository.create).toHaveBeenCalledTimes(
      DEFAULT_PROJECT_PHASES.length,
    );
    DEFAULT_PROJECT_PHASES.forEach((name, index) => {
      expect(projectPhasesRepository.create).toHaveBeenCalledWith({
        name,
        description: null,
        orderIndex: index + 1,
        projectId: project.id,
      });
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(project);
    expect(projectsRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(projectPhasesRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Planning',
        description: null,
        orderIndex: 1,
        projectId: project.id,
      }),
      expect.objectContaining({
        name: 'Execution',
        description: null,
        orderIndex: 2,
        projectId: project.id,
      }),
      expect.objectContaining({
        name: 'Review',
        description: null,
        orderIndex: 3,
        projectId: project.id,
      }),
      expect.objectContaining({
        name: 'Launch',
        description: null,
        orderIndex: 4,
        projectId: project.id,
      }),
    ]);
  });

  it('stores nullable optional fields when they are omitted', async () => {
    const area = createArea();
    const project = createProject({
      description: null,
      startDate: null,
      endDate: null,
      area,
    });
    const phases = [createProjectPhase()];

    mockAreaService.findOne.mockResolvedValue(area);
    projectsRepository.create?.mockReturnValue(project);
    projectsRepository.save?.mockResolvedValue(project);
    projectPhasesRepository.save?.mockResolvedValue(phases);

    await expect(
      service.create({
        name: 'Proyecto sin fechas',
        areaId: 1,
      }),
    ).resolves.toEqual({
      ...project,
      phases,
    });
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
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
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

  it('returns project detail with phases ordered by order index', async () => {
    const project = createProject({
      phases: [
        createProjectPhase({ id: 1, orderIndex: 1 }),
        createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
      ],
    });

    projectsRepository.findOne?.mockResolvedValue(project);

    await expect(service.findOne(1)).resolves.toEqual(project);
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['area', 'phases'],
      order: {
        phases: {
          orderIndex: 'ASC',
        },
      },
    });
  });

  it('rejects project detail when the project does not exist', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(
      new NotFoundException('Project with ID 99 not found'),
    );
  });

  it('lists phases for an existing project', async () => {
    const project = createProject();
    const phases = [createProjectPhase(), createProjectPhase({ id: 2 })];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(service.findPhases(1)).resolves.toEqual(phases);
    expect(projectPhasesRepository.find).toHaveBeenCalledWith({
      where: { projectId: 1 },
      order: { orderIndex: 'ASC' },
    });
  });

  it('creates custom phases after the current last phase', async () => {
    const project = createProject();
    const lastPhase = createProjectPhase({ orderIndex: 4 });
    const phase = createProjectPhase({
      id: 5,
      name: 'Retrospective',
      description: 'Closeout notes',
      orderIndex: 5,
    });

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.findOne?.mockResolvedValue(lastPhase);
    projectPhasesRepository.create?.mockReturnValue(phase);
    projectPhasesRepository.save?.mockResolvedValue(phase);

    await expect(
      service.createPhase(1, {
        name: 'Retrospective',
        description: 'Closeout notes',
      }),
    ).resolves.toEqual(phase);
    expect(projectPhasesRepository.findOne).toHaveBeenCalledWith({
      where: { projectId: 1 },
      order: { orderIndex: 'DESC' },
    });
    expect(projectPhasesRepository.create).toHaveBeenCalledWith({
      name: 'Retrospective',
      description: 'Closeout notes',
      orderIndex: 5,
      projectId: project.id,
    });
  });

  it('updates phase names and descriptions', async () => {
    const phase = createProjectPhase();
    const updatedPhase = createProjectPhase({
      name: 'Discovery',
      description: 'Initial work',
    });

    projectPhasesRepository.findOne?.mockResolvedValue(phase);
    projectPhasesRepository.save?.mockResolvedValue(updatedPhase);

    await expect(
      service.updatePhase(1, 1, {
        name: 'Discovery',
        description: 'Initial work',
      }),
    ).resolves.toEqual(updatedPhase);
    expect(projectPhasesRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1, projectId: 1 },
    });
    expect(projectPhasesRepository.save).toHaveBeenCalledWith({
      ...phase,
      name: 'Discovery',
      description: 'Initial work',
    });
  });

  it('reorders phases when every phase id is included exactly once', async () => {
    const project = createProject();
    const phases = [
      createProjectPhase({ id: 1, orderIndex: 1 }),
      createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
      createProjectPhase({ id: 3, name: 'Review', orderIndex: 3 }),
    ];
    const reorderedPhases = [
      { ...phases[2], orderIndex: 1 },
      { ...phases[0], orderIndex: 2 },
      { ...phases[1], orderIndex: 3 },
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);
    projectPhasesRepository.save?.mockResolvedValue(reorderedPhases);

    await expect(
      service.reorderPhases(1, { phaseIds: [3, 1, 2] }),
    ).resolves.toEqual(reorderedPhases);
    expect(projectPhasesRepository.save).toHaveBeenCalledWith(reorderedPhases);
  });

  it('rejects phase reorder requests that omit or include unknown phases', async () => {
    const project = createProject();
    const phases = [
      createProjectPhase({ id: 1, orderIndex: 1 }),
      createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(
      service.reorderPhases(1, { phaseIds: [1, 99] }),
    ).rejects.toThrow(
      new BadRequestException(
        'phaseIds must include every project phase exactly once',
      ),
    );
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
  });

  it('deletes a phase and compacts remaining phase order', async () => {
    const project = createProject();
    const phases = [
      createProjectPhase({ id: 1, orderIndex: 1 }),
      createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
      createProjectPhase({ id: 3, name: 'Review', orderIndex: 3 }),
    ];
    const remainingPhases = [
      { ...phases[0], orderIndex: 1 },
      { ...phases[2], orderIndex: 2 },
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);
    projectPhasesRepository.remove?.mockResolvedValue(phases[1]);
    projectPhasesRepository.save?.mockResolvedValue(remainingPhases);

    await expect(service.deletePhase(1, 2)).resolves.toBeUndefined();
    expect(projectPhasesRepository.manager.transaction).toHaveBeenCalledTimes(
      1,
    );
    expect(projectPhasesRepository.remove).toHaveBeenCalledWith(phases[1]);
    expect(projectPhasesRepository.save).toHaveBeenCalledWith(remainingPhases);
  });

  it('rejects deleting the last project phase', async () => {
    const project = createProject();
    const phases = [createProjectPhase()];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(service.deletePhase(1, 1)).rejects.toThrow(
      new BadRequestException('Projects must keep at least one phase'),
    );
    expect(projectPhasesRepository.remove).not.toHaveBeenCalled();
  });
});
