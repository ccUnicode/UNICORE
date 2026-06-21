import { Test, TestingModule } from '@nestjs/testing';
import { Area } from '../area/entities/area.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectRole } from '../common/enums/project-role.enum';

const createArea = (overrides: Partial<Area> = {}): Area => ({
  id: 1,
  name: 'Tecnologia',
  description: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [],
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
    memberships: [],
    ...overrides,
  };
};

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    addTeamMember: jest.fn(),
    updateTeamMemberRole: jest.fn(),
    removeTeamMember: jest.fn(),
  };

  const mockAccessActor = {
    role: AreaRole.PRESIDENCIA,
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

  it('gets a single project detail', async () => {
    const project = createProject();
    mockProjectsService.findOne.mockResolvedValue(project);

    await expect(controller.findOne(1, mockAccessActor)).resolves.toEqual(
      project,
    );
    expect(mockProjectsService.findOne).toHaveBeenCalledWith(
      1,
      mockAccessActor,
    );
  });

  it('adds a team member', async () => {
    const addDto = { memberId: 10, role: ProjectRole.MEMBER };
    const result = {
      id: 100,
      projectId: 1,
      memberId: 10,
      role: ProjectRole.MEMBER,
    };
    mockProjectsService.addTeamMember.mockResolvedValue(result);

    await expect(
      controller.addTeamMember(1, addDto, mockAccessActor),
    ).resolves.toEqual(result);
    expect(mockProjectsService.addTeamMember).toHaveBeenCalledWith(
      1,
      addDto,
      mockAccessActor,
    );
  });

  it('updates a team member role', async () => {
    const updateDto = { role: ProjectRole.REPRESENTATIVE };
    const result = {
      id: 100,
      projectId: 1,
      memberId: 10,
      role: ProjectRole.REPRESENTATIVE,
    };
    mockProjectsService.updateTeamMemberRole.mockResolvedValue(result);

    await expect(
      controller.updateTeamMemberRole(1, 10, updateDto, mockAccessActor),
    ).resolves.toEqual(result);
    expect(mockProjectsService.updateTeamMemberRole).toHaveBeenCalledWith(
      1,
      10,
      updateDto,
      mockAccessActor,
    );
  });

  it('removes a team member', async () => {
    mockProjectsService.removeTeamMember.mockResolvedValue(undefined);

    await expect(
      controller.removeTeamMember(1, 10, mockAccessActor),
    ).resolves.toBeUndefined();
    expect(mockProjectsService.removeTeamMember).toHaveBeenCalledWith(
      1,
      10,
      mockAccessActor,
    );
  });
});
