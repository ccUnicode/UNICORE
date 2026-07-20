import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectRole } from '../common/enums/project-role.enum';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { MemberStatus } from '../members/enums/member-status.enum';
import { Member } from '../members/member.entity';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectMembership } from './entities/project-membership.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

type RepositoryMethodMocks<T extends ObjectLiteral> = Partial<
  Record<Exclude<keyof Repository<T>, 'manager'>, jest.Mock>
>;

type RepositoryMock<T extends ObjectLiteral> = RepositoryMethodMocks<T> & {
  manager?: {
    transaction: jest.Mock;
  };
};

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
    memberships: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

const createMember = (overrides: Partial<Member> = {}): Member => {
  const memberId = overrides.id ?? 1;
  const areaId = overrides.areaId ?? 1;

  return {
    id: memberId,
    institution: 'UNI',
    studentCode: '20230001',
    firstNames: 'Ana',
    lastNames: 'Rojas',
    major: 'Sistemas',
    birthDate: '2004-04-18',
    role: AreaRole.MIEMBRO,
    areaId,
    area: null,
    activityStatus: MemberActivityStatus.ACTIVE,
    availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
    skills: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: MemberStatus.Available,
    memberships: [
      {
        id: 1,
        role: AreaRole.MIEMBRO,
        memberId,
        areaId: areaId,
        member: {} as Member,
        area: {} as Area,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    projectMemberships: [],
    ...overrides,
  };
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: RepositoryMock<Project>;
  let projectPhasesRepository: RepositoryMock<ProjectPhase>;
  let projectMembershipsRepository: RepositoryMock<ProjectMembership>;
  let membersRepository: RepositoryMock<Member>;

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

  const adminActor: RequestAccessActor = {
    role: AreaRole.PRESIDENCIA,
  };

  const directivaActor: RequestAccessActor = {
    role: AreaRole.DIRECTIVA_DE_AREA,
    areaId: '1',
  };

  const otherDirectivaActor: RequestAccessActor = {
    role: AreaRole.DIRECTIVA_DE_AREA,
    areaId: '2',
  };

  const memberActor: RequestAccessActor = {
    role: AreaRole.MIEMBRO,
    projectIds: ['1'],
  };

  const otherMemberActor: RequestAccessActor = {
    role: AreaRole.MIEMBRO,
    projectIds: ['2'],
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
    projectMembershipsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    membersRepository = {
      findOne: jest.fn(),
    };

    const getRepository = jest.fn(
      (
        entity:
          | typeof Project
          | typeof ProjectPhase
          | typeof ProjectMembership
          | typeof Member,
      ) => {
        if (entity === Project) return projectsRepository;
        if (entity === ProjectPhase) return projectPhasesRepository;
        if (entity === ProjectMembership) return projectMembershipsRepository;
        return membersRepository;
      },
    );
    const transaction = jest.fn(
      async (
        callback: (entityManager: {
          getRepository: typeof getRepository;
        }) => Promise<unknown>,
      ) => callback({ getRepository }),
    );
    projectsRepository.manager!.transaction = transaction;
    projectPhasesRepository.manager!.transaction = transaction;

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
          provide: getRepositoryToken(ProjectMembership),
          useValue: projectMembershipsRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: membersRepository,
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
    expect(projectsRepository.manager!.transaction).toHaveBeenCalledTimes(1);
    expect(projectPhasesRepository.create).toHaveBeenCalledTimes(
      DEFAULT_PROJECT_PHASES.length,
    );
    expect(projectPhasesRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Planning', orderIndex: 1 }),
      expect.objectContaining({ name: 'Execution', orderIndex: 2 }),
      expect.objectContaining({ name: 'Review', orderIndex: 3 }),
      expect.objectContaining({ name: 'Launch', orderIndex: 4 }),
    ]);
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

  describe('findOne', () => {
    it('returns a project with phases and active memberships first', async () => {
      const memberships: ProjectMembership[] = [
        {
          id: 1,
          role: ProjectRole.MEMBER,
          projectId: 1,
          memberId: 20,
          member: createMember({
            id: 20,
            activityStatus: MemberActivityStatus.INACTIVE,
          }),
          project: {} as Project,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          role: ProjectRole.REPRESENTATIVE,
          projectId: 1,
          memberId: 10,
          member: createMember({
            id: 10,
            activityStatus: MemberActivityStatus.ACTIVE,
          }),
          project: {} as Project,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const project = createProject({
        memberships,
        phases: [createProjectPhase()],
      });
      projectsRepository.findOne?.mockResolvedValue(project);

      const result = await service.findOne(1, adminActor);

      expect(result).toEqual(project);
      expect(
        result.memberships.map((membership) => membership.memberId),
      ).toEqual([10, 20]);
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['area', 'phases', 'memberships', 'memberships.member'],
        order: {
          phases: {
            orderIndex: 'ASC',
          },
        },
      });
    });

    it('throws NotFoundException when project is not found', async () => {
      projectsRepository.findOne?.mockResolvedValue(null);

      await expect(service.findOne(999, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('enforces area scope for directiva actor', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      projectsRepository.findOne?.mockResolvedValue(project);

      await expect(service.findOne(1, directivaActor)).resolves.toEqual(
        project,
      );
      await expect(service.findOne(1, otherDirectivaActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('enforces project scope for member actor', async () => {
      const project = createProject({ id: 1 });
      projectsRepository.findOne?.mockResolvedValue(project);

      await expect(service.findOne(1, memberActor)).resolves.toEqual(project);
      await expect(service.findOne(1, otherMemberActor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('project phases', () => {
    it('lists phases for an accessible project', async () => {
      const project = createProject();
      const phases = [createProjectPhase(), createProjectPhase({ id: 2 })];

      projectsRepository.findOne?.mockResolvedValue(project);
      projectPhasesRepository.find?.mockResolvedValue(phases);

      await expect(service.findPhases(1, adminActor)).resolves.toEqual(phases);
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
        service.createPhase(
          1,
          {
            name: 'Retrospective',
            description: 'Closeout notes',
          },
          adminActor,
        ),
      ).resolves.toEqual(phase);
      expect(
        projectPhasesRepository.manager!.transaction,
      ).toHaveBeenCalledTimes(1);
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(projectPhasesRepository.create).toHaveBeenCalledWith({
        name: 'Retrospective',
        description: 'Closeout notes',
        orderIndex: 5,
        projectId: project.id,
      });
    });

    it('rejects phase changes from another area directiva', async () => {
      const project = createProject({ areaId: 1 });
      projectsRepository.findOne?.mockResolvedValue(project);

      await expect(
        service.createPhase(1, { name: 'Blocked' }, otherDirectivaActor),
      ).rejects.toThrow(ForbiddenException);
      expect(projectPhasesRepository.save).not.toHaveBeenCalled();
    });

    it('updates phase names and descriptions', async () => {
      const project = createProject();
      const phase = createProjectPhase();
      const updatedPhase = createProjectPhase({
        name: 'Discovery',
        description: 'Initial work',
      });

      projectsRepository.findOne?.mockResolvedValue(project);
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
          adminActor,
        ),
      ).resolves.toEqual(updatedPhase);
      expect(projectPhasesRepository.update).toHaveBeenCalledWith(
        { id: 1, projectId: 1 },
        {
          name: 'Discovery',
          description: 'Initial work',
        },
      );
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
      projectPhasesRepository.find
        ?.mockResolvedValueOnce(phases)
        .mockResolvedValueOnce(reorderedPhases);

      await expect(
        service.reorderPhases(1, { phaseIds: [3, 1, 2] }, adminActor),
      ).resolves.toEqual(reorderedPhases);
      expect(projectPhasesRepository.save).toHaveBeenCalledWith([
        { id: 3, orderIndex: 1 },
        { id: 1, orderIndex: 2 },
        { id: 2, orderIndex: 3 },
      ]);
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
        service.reorderPhases(1, { phaseIds: [1, 1] }, adminActor),
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

      projectsRepository.findOne?.mockResolvedValue(project);
      projectPhasesRepository.find?.mockResolvedValue(phases);
      projectPhasesRepository.remove?.mockResolvedValue(phases[1]);

      await expect(
        service.deletePhase(1, 2, adminActor),
      ).resolves.toBeUndefined();
      expect(projectPhasesRepository.remove).toHaveBeenCalledWith(phases[1]);
      expect(projectPhasesRepository.save).toHaveBeenCalledWith([
        { id: 1, orderIndex: 1 },
        { id: 3, orderIndex: 2 },
      ]);
    });

    it('rejects deleting the last project phase', async () => {
      const project = createProject();
      const phases = [createProjectPhase()];

      projectsRepository.findOne?.mockResolvedValue(project);
      projectPhasesRepository.find?.mockResolvedValue(phases);

      await expect(service.deletePhase(1, 1, adminActor)).rejects.toThrow(
        new BadRequestException('Projects must keep at least one phase'),
      );
      expect(projectPhasesRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('team members', () => {
    it('successfully adds a member to the project team', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const member = createMember({
        id: 10,
        areaId: 1,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      });
      const membership = {
        id: 100,
        projectId: 1,
        memberId: 10,
        role: ProjectRole.MEMBER,
        member,
      };

      projectsRepository.findOne?.mockResolvedValue(project);
      membersRepository.findOne?.mockResolvedValue(member);
      projectMembershipsRepository.findOne?.mockImplementation(
        (query: { where?: { id?: number } }) => {
          if (query.where?.id === 100) return Promise.resolve(membership);
          return Promise.resolve(null);
        },
      );
      projectMembershipsRepository.create?.mockReturnValue(membership);
      projectMembershipsRepository.save?.mockResolvedValue(membership);

      const result = await service.addTeamMember(
        1,
        { memberId: 10, role: ProjectRole.MEMBER },
        adminActor,
      );

      expect(result).toEqual(membership);
      expect(projectMembershipsRepository.create).toHaveBeenCalledWith({
        projectId: 1,
        memberId: 10,
        role: ProjectRole.MEMBER,
      });
    });

    it('throws BadRequestException if member is not available', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const member = createMember({
        id: 10,
        availabilityStatus: MemberAvailabilityStatus.UNAVAILABLE,
      });

      projectsRepository.findOne?.mockResolvedValue(project);
      membersRepository.findOne?.mockResolvedValue(member);

      await expect(
        service.addTeamMember(
          1,
          { memberId: 10, role: ProjectRole.MEMBER },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if member is from a different area', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const member = createMember({
        id: 10,
        areaId: 2,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      });

      projectsRepository.findOne?.mockResolvedValue(project);
      membersRepository.findOne?.mockResolvedValue(member);

      await expect(
        service.addTeamMember(
          1,
          { memberId: 10, role: ProjectRole.MEMBER },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if member is already in the project team', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const member = createMember({ id: 10, areaId: 1 });

      projectsRepository.findOne?.mockResolvedValue(project);
      membersRepository.findOne?.mockResolvedValue(member);
      projectMembershipsRepository.findOne?.mockResolvedValue({ id: 100 });

      await expect(
        service.addTeamMember(
          1,
          { memberId: 10, role: ProjectRole.MEMBER },
          adminActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("successfully updates a member's project role", async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const member = createMember({ id: 10 });
      const membership = {
        id: 100,
        projectId: 1,
        memberId: 10,
        role: ProjectRole.MEMBER,
        member,
      };

      projectsRepository.findOne?.mockResolvedValue(project);
      projectMembershipsRepository.findOne?.mockImplementation(
        (query: {
          where?: { id?: number; projectId?: number; memberId?: number };
        }) => {
          if (query.where?.id === 100 || query.where?.memberId === 10) {
            return Promise.resolve(membership);
          }
          return Promise.resolve(null);
        },
      );
      projectMembershipsRepository.save?.mockResolvedValue(membership);

      const result = await service.updateTeamMemberRole(
        1,
        10,
        { role: ProjectRole.REPRESENTATIVE },
        adminActor,
      );

      expect(result.role).toBe(ProjectRole.REPRESENTATIVE);
    });

    it('successfully removes a member from the project team', async () => {
      const project = createProject({ id: 1, areaId: 1 });
      const membership = { id: 100, projectId: 1, memberId: 10 };

      projectsRepository.findOne?.mockResolvedValue(project);
      projectMembershipsRepository.findOne?.mockResolvedValue(membership);
      projectMembershipsRepository.remove?.mockResolvedValue(membership);

      await expect(
        service.removeTeamMember(1, 10, adminActor),
      ).resolves.not.toThrow();
      expect(projectMembershipsRepository.remove).toHaveBeenCalledWith(
        membership,
      );
    });

    it('rejects directiva team changes outside their area', async () => {
      const project = createProject({ id: 1, areaId: 1 });

      projectsRepository.findOne?.mockResolvedValue(project);

      await expect(
        service.removeTeamMember(1, 10, otherDirectivaActor),
      ).rejects.toThrow(ForbiddenException);
      expect(projectMembershipsRepository.remove).not.toHaveBeenCalled();
    });
  });
});
