import { Test, TestingModule } from '@nestjs/testing';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

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

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    findPhases: jest.fn(),
    createPhase: jest.fn(),
    updatePhase: jest.fn(),
    reorderPhases: jest.fn(),
    deletePhase: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('creates projects through the service', async () => {
    const createProjectDto: CreateProjectDto = {
      name: 'Portal de miembros',
      description: 'Proyecto base',
      startDate: '2026-06-01',
      endDate: '2026-07-01',
      areaId: 1,
    };
    const createdProject = createProject();

    mockProjectsService.create.mockResolvedValue(createdProject);

    await expect(controller.create(createProjectDto)).resolves.toEqual(
      createdProject,
    );
    expect(mockProjectsService.create).toHaveBeenCalledWith(createProjectDto);
  });

  it('lists projects through the service with pagination', async () => {
    const paginationDto = { page: 2, limit: 5 };
    const accessActor = { role: AreaRole.PRESIDENCIA };
    const response = {
      data: [createProject()],
      meta: {
        total: 6,
        page: 2,
        limit: 5,
        lastPage: 2,
      },
    };

    mockProjectsService.findAll.mockResolvedValue(response);

    await expect(
      controller.findAll(accessActor, paginationDto),
    ).resolves.toEqual(response);
    expect(mockProjectsService.findAll).toHaveBeenCalledWith(
      paginationDto,
      accessActor,
    );
  });

  it('gets project detail through the service', async () => {
    const project = createProject({ phases: [createProjectPhase()] });

    mockProjectsService.findOne.mockResolvedValue(project);

    await expect(controller.findOne(1)).resolves.toEqual(project);
    expect(mockProjectsService.findOne).toHaveBeenCalledWith(1);
  });

  it('updates projects through the service', async () => {
    const updateProjectDto = {
      status: ProjectStatus.ACTIVE,
      labels: ['Backend'],
    };
    const project = createProject({
      status: ProjectStatus.ACTIVE,
    });

    mockProjectsService.update.mockResolvedValue(project);

    await expect(controller.update(1, updateProjectDto)).resolves.toEqual(
      project,
    );
    expect(mockProjectsService.update).toHaveBeenCalledWith(
      1,
      updateProjectDto,
    );
  });

  it('archives projects through the service', async () => {
    const project = createProject({ isArchived: true });

    mockProjectsService.archive.mockResolvedValue(project);

    await expect(controller.archive(1)).resolves.toEqual(project);
    expect(mockProjectsService.archive).toHaveBeenCalledWith(1);
  });

  it('lists project phases through the service', async () => {
    const phases = [createProjectPhase()];

    mockProjectsService.findPhases.mockResolvedValue(phases);

    await expect(controller.findPhases(1)).resolves.toEqual(phases);
    expect(mockProjectsService.findPhases).toHaveBeenCalledWith(1);
  });

  it('creates project phases through the service', async () => {
    const createProjectPhaseDto: CreateProjectPhaseDto = {
      name: 'Retrospective',
      description: 'Closeout notes',
    };
    const phase = createProjectPhase({
      name: 'Retrospective',
      description: 'Closeout notes',
    });

    mockProjectsService.createPhase.mockResolvedValue(phase);

    await expect(
      controller.createPhase(1, createProjectPhaseDto),
    ).resolves.toEqual(phase);
    expect(mockProjectsService.createPhase).toHaveBeenCalledWith(
      1,
      createProjectPhaseDto,
    );
  });

  it('updates project phases through the service', async () => {
    const updateProjectPhaseDto: UpdateProjectPhaseDto = {
      name: 'Discovery',
    };
    const phase = createProjectPhase({ name: 'Discovery' });

    mockProjectsService.updatePhase.mockResolvedValue(phase);

    await expect(
      controller.updatePhase(1, 2, updateProjectPhaseDto),
    ).resolves.toEqual(phase);
    expect(mockProjectsService.updatePhase).toHaveBeenCalledWith(
      1,
      2,
      updateProjectPhaseDto,
    );
  });

  it('reorders project phases through the service', async () => {
    const reorderProjectPhasesDto: ReorderProjectPhasesDto = {
      phaseIds: [2, 1],
    };
    const phases = [
      createProjectPhase({ id: 2, orderIndex: 1 }),
      createProjectPhase({ id: 1, orderIndex: 2 }),
    ];

    mockProjectsService.reorderPhases.mockResolvedValue(phases);

    await expect(
      controller.reorderPhases(1, reorderProjectPhasesDto),
    ).resolves.toEqual(phases);
    expect(mockProjectsService.reorderPhases).toHaveBeenCalledWith(
      1,
      reorderProjectPhasesDto,
    );
  });

  it('deletes project phases through the service', async () => {
    mockProjectsService.deletePhase.mockResolvedValue(undefined);

    await expect(controller.deletePhase(1, 2)).resolves.toBeUndefined();
    expect(mockProjectsService.deletePhase).toHaveBeenCalledWith(1, 2);
  });
});
