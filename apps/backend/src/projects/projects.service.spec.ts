import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { Area } from '../area/entities/area.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
import { ProjectMembership } from './entities/project-membership.entity';
import { Member } from '../members/member.entity';
import { ProjectsService } from './projects.service';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectRole } from '../common/enums/project-role.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberStatus } from '../members/enums/member-status.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';

type ProjectRepositoryMock = Partial<
  Record<keyof Repository<Project>, jest.Mock>
>;
type ProjectMembershipRepositoryMock = Partial<
  Record<keyof Repository<ProjectMembership>, jest.Mock>
>;
type MemberRepositoryMock = Partial<
  Record<keyof Repository<Member>, jest.Mock>
>;

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

const createMember = (overrides: Partial<Member> = {}): Member => ({
  id: 1,
  institution: 'UNI',
  studentCode: '20230001',
  firstNames: 'Ana',
  lastNames: 'Rojas',
  major: 'Sistemas',
  birthDate: '2004-04-18',
  role: AreaRole.MIEMBRO,
  areaId: 1,
  area: null,
  activityStatus: MemberActivityStatus.ACTIVE,
  availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
  skills: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  status: MemberStatus.Available,
  memberships: [],
  projectMemberships: [],
  ...overrides,
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: ProjectRepositoryMock;
  let projectMembershipsRepository: ProjectMembershipRepositoryMock;
  let membersRepository: MemberRepositoryMock;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
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

  describe('findOne', () => {
    it('returns a project and sorts memberships with inactive members at the end', async () => {
      const activeMember = createMember({
        id: 10,
        activityStatus: MemberActivityStatus.ACTIVE,
      });
      const inactiveMember = createMember({
        id: 20,
        activityStatus: MemberActivityStatus.INACTIVE,
      });
      const activeMember2 = createMember({
        id: 30,
        activityStatus: MemberActivityStatus.ACTIVE,
      });

      const memberships: ProjectMembership[] = [
        {
          id: 1,
          role: ProjectRole.MEMBER,
          projectId: 1,
          memberId: 20,
          member: inactiveMember,
          project: {} as unknown as Project,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          role: ProjectRole.REPRESENTATIVE,
          projectId: 1,
          memberId: 10,
          member: activeMember,
          project: {} as unknown as Project,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          role: ProjectRole.MEMBER,
          projectId: 1,
          memberId: 30,
          member: activeMember2,
          project: {} as unknown as Project,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const project = createProject({ id: 1, memberships });
      projectsRepository.findOne?.mockResolvedValue(project);

      const result = await service.findOne(1, adminActor);
      expect(result).toEqual(project);

      // Active first, inactive last
      expect(result.memberships[0].memberId).toBe(10);
      expect(result.memberships[1].memberId).toBe(30);
      expect(result.memberships[2].memberId).toBe(20);
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
      const project = createProject({ id: 1, areaId: 1 });
      projectsRepository.findOne?.mockResolvedValue(project);

      await expect(service.findOne(1, memberActor)).resolves.toEqual(project);
      await expect(service.findOne(1, otherMemberActor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addTeamMember', () => {
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
      projectMembershipsRepository.findOne?.mockResolvedValue(null);
      projectMembershipsRepository.create?.mockReturnValue(membership);
      projectMembershipsRepository.save?.mockResolvedValue(membership);
      projectMembershipsRepository.findOne?.mockImplementation(
        (query: { where?: { id?: number } }) => {
          if (query.where?.id === 100) return Promise.resolve(membership);
          return Promise.resolve(null);
        },
      );

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
        areaId: 1,
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
      const member = createMember({
        id: 10,
        areaId: 1,
        availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
      });

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
  });

  describe('removeTeamMember', () => {
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

    it('throws NotFoundException if membership does not exist', async () => {
      const project = createProject({ id: 1, areaId: 1 });

      projectsRepository.findOne?.mockResolvedValue(project);
      projectMembershipsRepository.findOne?.mockResolvedValue(null);

      await expect(service.removeTeamMember(1, 10, adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTeamMemberRole', () => {
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
      projectMembershipsRepository.findOne?.mockResolvedValue(membership);
      projectMembershipsRepository.save?.mockResolvedValue(membership);
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

      const result = await service.updateTeamMemberRole(
        1,
        10,
        { role: ProjectRole.REPRESENTATIVE },
        adminActor,
      );
      expect(result.role).toBe(ProjectRole.REPRESENTATIVE);
    });
  });
});
