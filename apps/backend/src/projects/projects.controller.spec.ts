import { Test, TestingModule } from '@nestjs/testing';
import { Area } from '../area/entities/area.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
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

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
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

    await expect(controller.findAll(paginationDto)).resolves.toEqual(response);
    expect(mockProjectsService.findAll).toHaveBeenCalledWith(paginationDto);
  });
});
