import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { AreaService } from '../area/area.service';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectLabel } from './entities/project-label.entity';
import { ProjectLink } from './entities/project-link.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectStatus } from './enums/project-status.enum';
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
type ProjectLabelRepositoryMock = RepositoryMethodMocks<ProjectLabel>;
type ProjectLinkRepositoryMock = RepositoryMethodMocks<ProjectLink>;

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

const createProjectLabel = (
  overrides: Partial<ProjectLabel> = {},
): ProjectLabel => ({
  id: 1,
  name: 'Backend',
  normalizedName: 'backend',
  projects: [],
  createdAt: new Date(),
  ...overrides,
});

const createProjectLink = (
  overrides: Partial<ProjectLink> = {},
): ProjectLink => ({
  id: 1,
  name: 'Repository',
  url: 'https://github.com/ccUnicode/UNICORE',
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
    status: ProjectStatus.PLANNED,
    isArchived: false,
    phases: [],
    labels: [],
    links: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

const presidencyActor: RequestAccessActor = {
  role: AreaRole.PRESIDENCIA,
};
const areaLeaderActor: RequestAccessActor = {
  role: AreaRole.DIRECTIVA_DE_AREA,
  areaId: '1',
};
const memberActor: RequestAccessActor = {
  role: AreaRole.MIEMBRO,
  projectIds: ['1'],
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: ProjectRepositoryMock;
  let projectPhasesRepository: ProjectPhaseRepositoryMock;
  let projectLabelsRepository: ProjectLabelRepositoryMock;
  let projectLinksRepository: ProjectLinkRepositoryMock;

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
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };
    projectLabelsRepository = {
      create: jest.fn((label: Partial<ProjectLabel>) =>
        createProjectLabel(label),
      ),
      find: jest.fn(),
      save: jest.fn(),
    };
    projectLinksRepository = {
      create: jest.fn((link: Partial<ProjectLink>) => createProjectLink(link)),
      save: jest.fn(),
      delete: jest.fn(),
    };
    const getRepository = jest.fn(
      (
        entity:
          | typeof Project
          | typeof ProjectPhase
          | typeof ProjectLabel
          | typeof ProjectLink,
      ) => {
        if (entity === Project) return projectsRepository;
        if (entity === ProjectPhase) return projectPhasesRepository;
        if (entity === ProjectLabel) return projectLabelsRepository;
        return projectLinksRepository;
      },
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
          provide: getRepositoryToken(ProjectLabel),
          useValue: projectLabelsRepository,
        },
        {
          provide: getRepositoryToken(ProjectLink),
          useValue: projectLinksRepository,
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

    await expect(
      service.create(createProjectDto, presidencyActor),
    ).resolves.toEqual({
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
      status: ProjectStatus.PLANNED,
      isArchived: false,
      labels: [],
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
      service.create(
        {
          name: 'Proyecto sin fechas',
          areaId: 1,
        },
        presidencyActor,
      ),
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
      status: ProjectStatus.PLANNED,
      isArchived: false,
      labels: [],
    });
  });

  it('creates projects with reusable labels and external links', async () => {
    const area = createArea();
    const backendLabel = createProjectLabel();
    const priorityLabel = createProjectLabel({
      id: 2,
      name: 'Priority',
      normalizedName: 'priority',
    });
    const project = createProject({
      area,
      status: ProjectStatus.ACTIVE,
      labels: [backendLabel, priorityLabel],
    });
    const link = createProjectLink({ projectId: project.id });

    mockAreaService.findOne.mockResolvedValue(area);
    projectLabelsRepository.find?.mockResolvedValue([backendLabel]);
    projectLabelsRepository.save?.mockResolvedValue([priorityLabel]);
    projectsRepository.create?.mockReturnValue(project);
    projectsRepository.save?.mockResolvedValue(project);
    projectPhasesRepository.save?.mockResolvedValue([]);
    projectLinksRepository.save?.mockResolvedValue([link]);

    await expect(
      service.create(
        {
          ...createProjectDto,
          status: ProjectStatus.ACTIVE,
          labels: ['Backend', 'Priority'],
          links: [
            {
              name: 'Repository',
              url: 'https://github.com/ccUnicode/UNICORE',
            },
          ],
        },
        presidencyActor,
      ),
    ).resolves.toEqual({
      ...project,
      phases: [],
      links: [link],
    });
    expect(projectLabelsRepository.find).toHaveBeenCalledWith({
      where: { normalizedName: In(['backend', 'priority']) },
    });
    expect(projectLabelsRepository.create).toHaveBeenCalledWith({
      name: 'Priority',
      normalizedName: 'priority',
    });
    expect(projectLinksRepository.create).toHaveBeenCalledWith({
      name: 'Repository',
      url: 'https://github.com/ccUnicode/UNICORE',
      projectId: project.id,
    });
  });

  it('propagates NotFoundException when the area does not exist', async () => {
    mockAreaService.findOne.mockRejectedValue(
      new NotFoundException('Area with ID "99" not found'),
    );

    await expect(
      service.create(
        {
          ...createProjectDto,
          areaId: 99,
        },
        presidencyActor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(projectsRepository.create).not.toHaveBeenCalled();
    expect(projectsRepository.save).not.toHaveBeenCalled();
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects projects with an end date before the start date', async () => {
    await expect(
      service.create(
        {
          ...createProjectDto,
          startDate: '2026-07-01',
          endDate: '2026-06-01',
        },
        presidencyActor,
      ),
    ).rejects.toThrow(
      new BadRequestException('startDate must be before or equal to endDate'),
    );
    expect(mockAreaService.findOne).not.toHaveBeenCalled();
  });

  it('rejects project creation outside an area leader own area', async () => {
    await expect(
      service.create(
        {
          ...createProjectDto,
          areaId: 2,
        },
        areaLeaderActor,
      ),
    ).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
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
      where: { isArchived: false },
      relations: ['area', 'labels', 'links'],
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
      where: { isArchived: false },
      relations: ['area', 'labels', 'links'],
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });

  it('combines project metadata filters and includes archived projects explicitly', async () => {
    projectsRepository.findAndCount?.mockResolvedValue([[], 0]);

    await service.findAll({
      status: ProjectStatus.ACTIVE,
      areaId: 4,
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      labels: ['Backend'],
      search: 'portal',
      archived: true,
    });

    expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
      where: {
        isArchived: true,
        status: ProjectStatus.ACTIVE,
        areaId: 4,
        name: ILike('%portal%'),
        startDate: LessThanOrEqual('2026-06-30'),
        endDate: MoreThanOrEqual('2026-06-01'),
        labels: { normalizedName: In(['backend']) },
      },
      relations: ['area', 'labels', 'links'],
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });

  it('limits area leaders to projects in their own area', async () => {
    projectsRepository.findAndCount?.mockResolvedValue([[], 0]);

    await service.findAll(
      { areaId: 99 },
      { role: AreaRole.DIRECTIVA_DE_AREA, areaId: '3' },
    );

    expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
      where: { isArchived: false, areaId: 3 },
      relations: ['area', 'labels', 'links'],
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });

  it('limits members to their assigned project ids', async () => {
    projectsRepository.findAndCount?.mockResolvedValue([[], 0]);

    await service.findAll(
      {},
      { role: AreaRole.MIEMBRO, projectIds: ['2', '7'] },
    );

    expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
      where: { isArchived: false, id: In([2, 7]) },
      relations: ['area', 'labels', 'links'],
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });

  it('rejects inverted project date filters', async () => {
    await expect(
      service.findAll({ dateFrom: '2026-07-01', dateTo: '2026-06-01' }),
    ).rejects.toThrow(
      new BadRequestException('startDate must be before or equal to endDate'),
    );
    expect(projectsRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('returns project detail with phases ordered by order index', async () => {
    const project = createProject({
      phases: [
        createProjectPhase({ id: 1, orderIndex: 1 }),
        createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
      ],
    });

    projectsRepository.findOne?.mockResolvedValue(project);

    await expect(service.findOne(1, presidencyActor)).resolves.toEqual(project);
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['area', 'phases', 'labels', 'links'],
      order: {
        phases: {
          orderIndex: 'ASC',
        },
      },
    });
  });

  it('rejects project detail when the project does not exist', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(99, presidencyActor)).rejects.toThrow(
      new NotFoundException('Project with ID 99 not found'),
    );
  });

  it('rejects project detail outside an area leader own area', async () => {
    projectsRepository.findOne?.mockResolvedValue(
      createProject({ areaId: 2, area: createArea({ id: 2 }) }),
    );

    await expect(service.findOne(1, areaLeaderActor)).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
    );
  });

  it('rejects project detail for members without project assignment', async () => {
    projectsRepository.findOne?.mockResolvedValue(createProject({ id: 2 }));

    await expect(service.findOne(2, memberActor)).rejects.toThrow(
      new ForbiddenException('Project access is limited to assigned projects'),
    );
  });

  it('replaces project metadata during updates', async () => {
    const project = createProject();
    const label = createProjectLabel({
      name: 'Frontend',
      normalizedName: 'frontend',
    });
    const link = createProjectLink({
      name: 'Design',
      url: 'https://figma.com/file/123',
    });
    const updatedProject = createProject({
      name: 'Portal actualizado',
      status: ProjectStatus.ACTIVE,
      labels: [label],
      links: [link],
    });

    projectsRepository.findOne
      ?.mockResolvedValueOnce(project)
      .mockResolvedValueOnce(updatedProject);
    projectLabelsRepository.find?.mockResolvedValue([label]);
    projectsRepository.save?.mockResolvedValue(project);
    projectLinksRepository.delete?.mockResolvedValue({ affected: 1 });
    projectLinksRepository.save?.mockResolvedValue([link]);

    await expect(
      service.update(
        1,
        {
          name: 'Portal actualizado',
          status: ProjectStatus.ACTIVE,
          labels: ['Frontend'],
          links: [{ name: 'Design', url: 'https://figma.com/file/123' }],
        },
        presidencyActor,
      ),
    ).resolves.toEqual(updatedProject);
    expect(projectLinksRepository.delete).toHaveBeenCalledWith({
      projectId: 1,
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Portal actualizado',
        status: ProjectStatus.ACTIVE,
        labels: [label],
      }),
    );
  });

  it('archives projects', async () => {
    const project = createProject();
    const archivedProject = createProject({ isArchived: true });

    projectsRepository.findOne?.mockResolvedValue(project);
    projectsRepository.save?.mockResolvedValue(archivedProject);

    await expect(service.archive(1, presidencyActor)).resolves.toEqual(
      archivedProject,
    );
    expect(projectsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, isArchived: true }),
    );
  });

  it('rejects updates and archiving outside an area leader own area', async () => {
    const project = createProject({
      areaId: 2,
      area: createArea({ id: 2 }),
    });
    projectsRepository.findOne?.mockResolvedValue(project);

    await expect(
      service.update(1, { name: 'Sin permiso' }, areaLeaderActor),
    ).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
    );
    await expect(service.archive(1, areaLeaderActor)).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
    );
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects moving a project outside an area leader own area', async () => {
    projectsRepository.findOne?.mockResolvedValue(createProject());

    await expect(
      service.update(1, { areaId: 2 }, areaLeaderActor),
    ).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
    );
    expect(mockAreaService.findOne).not.toHaveBeenCalled();
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('lists phases for an existing project', async () => {
    const project = createProject();
    const phases = [createProjectPhase(), createProjectPhase({ id: 2 })];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(service.findPhases(1, presidencyActor)).resolves.toEqual(
      phases,
    );
    expect(projectPhasesRepository.find).toHaveBeenCalledWith({
      where: { projectId: 1 },
      order: { orderIndex: 'ASC' },
    });
  });

  it('rejects phase reads for members without project assignment', async () => {
    projectsRepository.findOne?.mockResolvedValue(createProject({ id: 2 }));

    await expect(service.findPhases(2, memberActor)).rejects.toThrow(
      new ForbiddenException('Project access is limited to assigned projects'),
    );
    expect(projectPhasesRepository.find).not.toHaveBeenCalled();
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
      service.createPhase(
        1,
        {
          name: 'Retrospective',
          description: 'Closeout notes',
        },
        presidencyActor,
      ),
    ).resolves.toEqual(phase);
    expect(projectPhasesRepository.manager.transaction).toHaveBeenCalledTimes(
      1,
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
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

  it('rejects phase creation outside an area leader own area', async () => {
    projectsRepository.findOne?.mockResolvedValue(
      createProject({ areaId: 2, area: createArea({ id: 2 }) }),
    );

    await expect(
      service.createPhase(1, { name: 'Sin permiso' }, areaLeaderActor),
    ).rejects.toThrow(
      new ForbiddenException('Project management is limited to your own area'),
    );
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
  });

  it('updates phase names and descriptions', async () => {
    projectsRepository.findOne?.mockResolvedValue(createProject());
    const phase = createProjectPhase();
    const updatedPhase = createProjectPhase({
      name: 'Discovery',
      description: 'Initial work',
    });

    projectPhasesRepository.findOne
      ?.mockResolvedValueOnce(phase)
      .mockResolvedValueOnce(updatedPhase);
    projectPhasesRepository.update?.mockResolvedValue({ affected: 1 });

    await expect(
      service.updatePhase(
        1,
        1,
        {
          name: 'Discovery',
          description: 'Initial work',
        },
        presidencyActor,
      ),
    ).resolves.toEqual(updatedPhase);
    expect(projectPhasesRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1, projectId: 1 },
    });
    expect(projectPhasesRepository.update).toHaveBeenCalledWith(
      { id: 1, projectId: 1 },
      {
        name: 'Discovery',
        description: 'Initial work',
      },
    );
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
  });

  it('returns existing phases without updating when phase updates are empty', async () => {
    projectsRepository.findOne?.mockResolvedValue(createProject());
    const phase = createProjectPhase();

    projectPhasesRepository.findOne
      ?.mockResolvedValueOnce(phase)
      .mockResolvedValueOnce(phase);

    await expect(
      service.updatePhase(1, 1, {}, presidencyActor),
    ).resolves.toEqual(phase);
    expect(projectPhasesRepository.update).not.toHaveBeenCalled();
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
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
    const reorderedPhaseUpdates = [
      { id: 3, orderIndex: 1 },
      { id: 1, orderIndex: 2 },
      { id: 2, orderIndex: 3 },
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find
      ?.mockResolvedValueOnce(phases)
      .mockResolvedValueOnce(reorderedPhases);
    projectPhasesRepository.save?.mockResolvedValue(reorderedPhaseUpdates);

    await expect(
      service.reorderPhases(1, { phaseIds: [3, 1, 2] }, presidencyActor),
    ).resolves.toEqual(reorderedPhases);
    expect(projectPhasesRepository.manager.transaction).toHaveBeenCalledTimes(
      1,
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(projectPhasesRepository.save).toHaveBeenCalledWith(
      reorderedPhaseUpdates,
    );
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
      service.reorderPhases(1, { phaseIds: [1, 99] }, presidencyActor),
    ).rejects.toThrow(
      new BadRequestException(
        'phaseIds must include every project phase exactly once',
      ),
    );
    expect(projectPhasesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects phase reorder requests with duplicate phase ids', async () => {
    const project = createProject();
    const phases = [
      createProjectPhase({ id: 1, orderIndex: 1 }),
      createProjectPhase({ id: 2, name: 'Execution', orderIndex: 2 }),
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(
      service.reorderPhases(1, { phaseIds: [1, 1] }, presidencyActor),
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
    const remainingPhaseUpdates = [
      { id: 1, orderIndex: 1 },
      { id: 3, orderIndex: 2 },
    ];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);
    projectPhasesRepository.remove?.mockResolvedValue(phases[1]);
    projectPhasesRepository.save?.mockResolvedValue(remainingPhaseUpdates);

    await expect(
      service.deletePhase(1, 2, presidencyActor),
    ).resolves.toBeUndefined();
    expect(projectPhasesRepository.manager.transaction).toHaveBeenCalledTimes(
      1,
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(projectPhasesRepository.remove).toHaveBeenCalledWith(phases[1]);
    expect(projectPhasesRepository.save).toHaveBeenCalledWith(
      remainingPhaseUpdates,
    );
  });

  it('rejects deleting the last project phase', async () => {
    const project = createProject();
    const phases = [createProjectPhase()];

    projectsRepository.findOne?.mockResolvedValue(project);
    projectPhasesRepository.find?.mockResolvedValue(phases);

    await expect(service.deletePhase(1, 1, presidencyActor)).rejects.toThrow(
      new BadRequestException('Projects must keep at least one phase'),
    );
    expect(projectPhasesRepository.remove).not.toHaveBeenCalled();
  });
});
