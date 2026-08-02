import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, In } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectRole } from '../common/enums/project-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { Member } from '../members/member.entity';
import { ProjectMembership } from '../projects/entities/project-membership.entity';
import { ProjectPhase } from '../projects/entities/project-phase.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectStatus } from '../projects/enums/project-status.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskAssignee } from './entities/task-assignee.entity';
import { Task } from './entities/task.entity';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskStatus } from './enums/task-status.enum';
import { TasksService } from './tasks.service';

const createMember = (overrides: Partial<Member> = {}): Member =>
  ({
    id: 1,
    institution: 'UNI',
    studentCode: '20200001',
    firstNames: 'Ana',
    lastNames: 'Torres',
    major: 'Ingeniería de Sistemas',
    birthDate: '2000-01-01',
    cycle: 8,
    activityStatus: MemberActivityStatus.ACTIVE,
    availabilityStatus: MemberAvailabilityStatus.AVAILABLE,
    skills: [],
    memberships: [],
    projectMemberships: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Member;

const createProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: 1,
    name: 'Portal de miembros',
    description: null,
    startDate: null,
    endDate: null,
    areaId: 1,
    status: ProjectStatus.ACTIVE,
    isArchived: false,
    phases: [],
    labels: [],
    links: [],
    memberships: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Project;

const createPhase = (overrides: Partial<ProjectPhase> = {}): ProjectPhase =>
  ({
    id: 10,
    name: 'Execution',
    description: null,
    orderIndex: 2,
    projectId: 1,
    project: createProject(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ProjectPhase;

const createMembership = (
  overrides: Partial<ProjectMembership> = {},
): ProjectMembership =>
  ({
    id: 1,
    projectId: 1,
    memberId: 1,
    role: ProjectRole.MEMBER,
    project: createProject(),
    member: createMember(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ProjectMembership;

const createTaskAssignee = (
  overrides: Partial<TaskAssignee> = {},
): TaskAssignee =>
  ({
    id: 1,
    taskId: 1,
    memberId: 1,
    task: {} as Task,
    member: createMember(),
    projectMembershipId: 1,
    projectMembership: createMembership(),
    createdAt: new Date(),
    ...overrides,
  }) as TaskAssignee;

const createTask = (overrides: Partial<Task> = {}): Task => {
  const project = overrides.project ?? createProject();

  return {
    id: 1,
    title: 'Implementar endpoint',
    description: null,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    status: TaskStatus.TODO,
    projectId: project.id,
    project,
    phaseId: null,
    phase: null,
    assignees: [createTaskAssignee()],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

const presidencyActor: RequestAccessActor = {
  role: AreaRole.PRESIDENCIA,
  memberId: '99',
};
const areaLeaderActor: RequestAccessActor = {
  role: AreaRole.DIRECTIVA_DE_AREA,
  areaId: '1',
  memberId: '2',
};
const memberActor: RequestAccessActor = {
  role: AreaRole.MIEMBRO,
  memberId: '1',
  projectIds: ['1'],
};

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let taskAssigneesRepository: Record<string, jest.Mock>;
  let projectsRepository: Record<string, jest.Mock>;
  let projectPhasesRepository: Record<string, jest.Mock>;
  let projectMembershipsRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    tasksRepository = {
      create: jest.fn((task: Partial<Task>) => createTask(task)),
      save: jest.fn((task: Task) => Promise.resolve(task)),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      manager: { transaction: jest.fn() },
    };
    taskAssigneesRepository = {
      create: jest.fn((assignee: Partial<TaskAssignee>) =>
        createTaskAssignee(assignee),
      ),
      save: jest.fn((assignees: TaskAssignee[]) => Promise.resolve(assignees)),
      delete: jest.fn(),
      find: jest.fn(),
    };
    projectsRepository = {
      findOne: jest.fn(),
    };
    projectPhasesRepository = {
      findOne: jest.fn(),
    };
    projectMembershipsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const getRepository = jest.fn((entity: unknown) => {
      if (entity === Task) return tasksRepository;
      if (entity === TaskAssignee) return taskAssigneesRepository;
      if (entity === Project) return projectsRepository;
      if (entity === ProjectPhase) return projectPhasesRepository;
      return projectMembershipsRepository;
    });
    tasksRepository.manager.transaction = jest.fn(
      (
        callback: (manager: { getRepository: typeof getRepository }) => unknown,
      ) => Promise.resolve(callback({ getRepository })),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        {
          provide: getRepositoryToken(TaskAssignee),
          useValue: taskAssigneesRepository,
        },
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: projectPhasesRepository,
        },
        {
          provide: getRepositoryToken(ProjectMembership),
          useValue: projectMembershipsRepository,
        },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      projectId: 1,
      phaseId: 10,
      title: 'Implementar endpoint',
      assigneeIds: [1],
    };

    it('creates a ToDo task with eligible project assignees', async () => {
      const project = createProject();
      const phase = createPhase();
      const membership = createMembership();
      const savedTask = createTask({ phaseId: phase.id, phase });

      projectsRepository.findOne.mockResolvedValue(project);
      projectPhasesRepository.findOne.mockResolvedValue(phase);
      projectMembershipsRepository.find.mockResolvedValue([membership]);
      tasksRepository.findOne.mockResolvedValue(savedTask);

      await expect(
        service.create(createTaskDto, presidencyActor),
      ).resolves.toEqual(savedTask);
      expect(tasksRepository.create).toHaveBeenCalledWith({
        projectId: 1,
        phaseId: 10,
        title: 'Implementar endpoint',
        description: null,
        priority: TaskPriority.MEDIUM,
        dueDate: null,
        status: TaskStatus.TODO,
      });
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(projectMembershipsRepository.find).toHaveBeenCalledWith({
        where: { projectId: 1, memberId: In([1]) },
        relations: ['member'],
      });
      expect(taskAssigneesRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          taskId: 1,
          memberId: 1,
          projectMembershipId: 1,
        }),
      ]);
    });

    it('allows a project representative to create tasks', async () => {
      const representative = createMembership({
        role: ProjectRole.REPRESENTATIVE,
      });

      projectsRepository.findOne.mockResolvedValue(createProject());
      projectPhasesRepository.findOne.mockResolvedValue(createPhase());
      projectMembershipsRepository.findOne.mockResolvedValue(representative);
      projectMembershipsRepository.find.mockResolvedValue([representative]);
      tasksRepository.findOne.mockResolvedValue(createTask());

      await expect(service.create(createTaskDto, memberActor)).resolves.toEqual(
        expect.objectContaining({ id: 1 }),
      );
    });

    it('creates tasks with nullable optional fields', async () => {
      const membership = createMembership();

      projectsRepository.findOne.mockResolvedValue(createProject());
      projectMembershipsRepository.find.mockResolvedValue([membership]);
      tasksRepository.findOne.mockResolvedValue(createTask());

      await expect(
        service.create(
          {
            ...createTaskDto,
            phaseId: null,
            description: null,
            priority: null,
            dueDate: null,
          },
          presidencyActor,
        ),
      ).resolves.toEqual(expect.objectContaining({ id: 1 }));
      expect(projectPhasesRepository.findOne).not.toHaveBeenCalled();
      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phaseId: null,
          description: null,
          priority: TaskPriority.MEDIUM,
          dueDate: null,
        }),
      );
    });

    it('rejects regular project members that try to create tasks', async () => {
      projectsRepository.findOne.mockResolvedValue(createProject());
      projectMembershipsRepository.findOne.mockResolvedValue(
        createMembership(),
      );

      await expect(service.create(createTaskDto, memberActor)).rejects.toThrow(
        new ForbiddenException(
          'Task management requires a project representative role',
        ),
      );
      expect(tasksRepository.save).not.toHaveBeenCalled();
    });

    it('rejects Directiva access to projects from another area', async () => {
      projectsRepository.findOne.mockResolvedValue(
        createProject({ areaId: 2 }),
      );

      await expect(
        service.create(createTaskDto, areaLeaderActor),
      ).rejects.toThrow(
        new ForbiddenException(
          'Task access is limited to projects in your own area',
        ),
      );
      expect(tasksRepository.save).not.toHaveBeenCalled();
    });

    it('rejects phases from another project', async () => {
      projectsRepository.findOne.mockResolvedValue(createProject());
      projectPhasesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createTaskDto, presidencyActor),
      ).rejects.toThrow(
        new BadRequestException(
          'Project phase with ID 10 does not belong to project 1',
        ),
      );
      expect(tasksRepository.save).not.toHaveBeenCalled();
    });

    it('rejects assignees that are not project members', async () => {
      projectsRepository.findOne.mockResolvedValue(createProject());
      projectPhasesRepository.findOne.mockResolvedValue(createPhase());
      projectMembershipsRepository.find.mockResolvedValue([]);

      await expect(
        service.create(createTaskDto, presidencyActor),
      ).rejects.toThrow(
        new BadRequestException('Member 1 does not belong to project 1'),
      );
      expect(tasksRepository.save).not.toHaveBeenCalled();
    });

    it('rejects unavailable assignees', async () => {
      const membership = createMembership({
        member: createMember({
          availabilityStatus: MemberAvailabilityStatus.NOT_AVAILABLE,
        }),
      });

      projectsRepository.findOne.mockResolvedValue(createProject());
      projectPhasesRepository.findOne.mockResolvedValue(createPhase());
      projectMembershipsRepository.find.mockResolvedValue([membership]);

      await expect(
        service.create(createTaskDto, presidencyActor),
      ).rejects.toThrow(
        new BadRequestException('Member 1 is not eligible for task assignment'),
      );
      expect(tasksRepository.save).not.toHaveBeenCalled();
    });
  });

  it('lists only tasks from a project the actor can access', async () => {
    const task = createTask();
    const membership = createMembership();

    projectsRepository.findOne.mockResolvedValue(createProject());
    projectMembershipsRepository.findOne.mockResolvedValue(membership);
    tasksRepository.findAndCount.mockResolvedValue([[task], 1]);

    await expect(
      service.findAll({ projectId: 1, page: 1, limit: 10 }, memberActor),
    ).resolves.toEqual({
      data: [task],
      meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
    });
    expect(tasksRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 1 },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('keeps every task assignee when filtering by one assignee', async () => {
    const task = createTask({
      assignees: [
        createTaskAssignee(),
        createTaskAssignee({
          id: 2,
          memberId: 2,
          member: createMember({ id: 2 }),
        }),
      ],
    });

    projectsRepository.findOne.mockResolvedValue(createProject());
    tasksRepository.findAndCount.mockResolvedValue([[task], 1]);

    const result = await service.findAll(
      { projectId: 1, assigneeId: 1 },
      presidencyActor,
    );

    expect(result.data[0].assignees).toHaveLength(2);
    expect(taskAssigneesRepository.find).not.toHaveBeenCalled();
    const [{ where }] = tasksRepository.findAndCount.mock.calls[0] as [
      { where: { projectId: number; id: FindOperator<number> } },
    ];
    expect(where.projectId).toBe(1);
    expect(where.id.type).toBe('raw');
    expect(where.id.objectLiteralParameters).toEqual({ assigneeId: 1 });
    expect(where.id.getSql?.('Task.id')).toBe(
      'EXISTS (SELECT 1 FROM task_assignees task_assignee_filter ' +
        'WHERE task_assignee_filter.task_id = Task.id ' +
        'AND task_assignee_filter.member_id = :assigneeId)',
    );
  });

  it('lets the paginated query return an empty page when an assignee has no matches', async () => {
    projectsRepository.findOne.mockResolvedValue(createProject());
    tasksRepository.findAndCount.mockResolvedValue([[], 0]);

    await expect(
      service.findAll(
        { projectId: 1, assigneeId: 99, page: 2, limit: 5 },
        presidencyActor,
      ),
    ).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 2, limit: 5, lastPage: 0 },
    });
    expect(taskAssigneesRepository.find).not.toHaveBeenCalled();
    expect(tasksRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
  });

  it('rejects phase filters from another project', async () => {
    projectsRepository.findOne.mockResolvedValue(createProject());
    projectPhasesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findAll({ projectId: 1, phaseId: 99 }, presidencyActor),
    ).rejects.toThrow(
      new BadRequestException(
        'Project phase with ID 99 does not belong to project 1',
      ),
    );
    expect(tasksRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('rejects task reads outside member project participation', async () => {
    tasksRepository.findOne.mockResolvedValue(createTask());
    projectMembershipsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(1, memberActor)).rejects.toThrow(
      new ForbiddenException(
        'Task access is limited to projects where you participate',
      ),
    );
  });

  it('allows a project member to advance an adjacent task status', async () => {
    const task = createTask({ status: TaskStatus.TODO });
    const membership = createMembership();

    tasksRepository.findOne.mockResolvedValue(task);
    projectsRepository.findOne.mockResolvedValue(task.project);
    projectMembershipsRepository.findOne.mockResolvedValue(membership);

    await expect(
      service.updateStatus(1, { status: TaskStatus.IN_PROGRESS }, memberActor),
    ).resolves.toEqual(
      expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
    );
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
    );
  });

  it('rejects status transitions that skip workflow states', async () => {
    const task = createTask({ status: TaskStatus.TODO });

    tasksRepository.findOne.mockResolvedValue(task);
    projectsRepository.findOne.mockResolvedValue(task.project);
    projectMembershipsRepository.findOne.mockResolvedValue(createMembership());

    await expect(
      service.updateStatus(1, { status: TaskStatus.DONE }, memberActor),
    ).rejects.toThrow(
      new BadRequestException('Cannot transition task from todo to done'),
    );
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('replaces task assignees atomically', async () => {
    const task = createTask();
    const memberships = [
      createMembership({
        id: 2,
        memberId: 2,
        member: createMember({ id: 2 }),
      }),
      createMembership({
        id: 3,
        memberId: 3,
        member: createMember({ id: 3 }),
      }),
    ];

    tasksRepository.findOne.mockResolvedValue(task);
    projectsRepository.findOne.mockResolvedValue(task.project);
    projectMembershipsRepository.find.mockResolvedValue(memberships);

    await expect(
      service.setAssignees(1, { memberIds: [2, 3] }, presidencyActor),
    ).resolves.toEqual(expect.objectContaining({ id: 1 }));
    expect(taskAssigneesRepository.delete).toHaveBeenCalledWith({ taskId: 1 });
    expect(taskAssigneesRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        taskId: 1,
        memberId: 2,
        projectMembershipId: 2,
      }),
      expect.objectContaining({
        taskId: 1,
        memberId: 3,
        projectMembershipId: 3,
      }),
    ]);
  });

  it('rejects mutations on archived projects', async () => {
    const task = createTask({ project: createProject({ isArchived: true }) });

    tasksRepository.findOne.mockResolvedValue(task);
    projectsRepository.findOne.mockResolvedValue(task.project);

    await expect(
      service.update(1, { title: 'Nuevo título' }, presidencyActor),
    ).rejects.toThrow(
      new BadRequestException('Archived projects cannot modify tasks'),
    );
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });
});
