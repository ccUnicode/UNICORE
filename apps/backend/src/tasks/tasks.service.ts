import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Raw, Repository } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectRole } from '../common/enums/project-role.enum';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { Member } from '../members/member.entity';
import { ProjectMembership } from '../projects/entities/project-membership.entity';
import { ProjectPhase } from '../projects/entities/project-phase.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { SetTaskAssigneesDto } from './dto/set-task-assignees.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskAssignee } from './entities/task-assignee.entity';
import { TaskComment } from './entities/task-comment.entity';
import { Task } from './entities/task.entity';
import { TaskStatusHistory } from './entities/task-status-history.entity';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskStatus } from './enums/task-status.enum';
import { AuditService } from '../audit/audit.service';

type TaskAccessMode = 'read' | 'manage' | 'status';

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
  [TaskStatus.DONE]: [TaskStatus.IN_REVIEW],
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskAssignee)
    private readonly taskAssigneesRepository: Repository<TaskAssignee>,
    @InjectRepository(TaskComment)
    private readonly taskCommentsRepository: Repository<TaskComment>,
    @InjectRepository(TaskStatusHistory)
    private readonly taskStatusHistoryRepository: Repository<TaskStatusHistory>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhasesRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMembership)
    private readonly projectMembershipsRepository: Repository<ProjectMembership>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    accessActor: RequestAccessActor,
  ): Promise<Task> {
    const taskId = await this.tasksRepository.manager.transaction(
      async (entityManager) => {
        const tasksRepository = entityManager.getRepository(Task);
        const taskAssigneesRepository =
          entityManager.getRepository(TaskAssignee);
        const projectsRepository = entityManager.getRepository(Project);
        const projectPhasesRepository =
          entityManager.getRepository(ProjectPhase);
        const projectMembershipsRepository =
          entityManager.getRepository(ProjectMembership);
        const project = await this.findProjectOrThrow(
          createTaskDto.projectId,
          projectsRepository,
          true,
        );

        await this.assertProjectAccess(
          project,
          accessActor,
          'manage',
          projectMembershipsRepository,
        );
        this.assertProjectIsActive(project);

        if (
          createTaskDto.phaseId !== undefined &&
          createTaskDto.phaseId !== null
        ) {
          await this.findPhaseOrThrow(
            project.id,
            createTaskDto.phaseId,
            projectPhasesRepository,
          );
        }

        const memberships = await this.validateAssignees(
          project.id,
          createTaskDto.assigneeIds,
          projectMembershipsRepository,
        );
        const task = tasksRepository.create({
          projectId: project.id,
          phaseId: createTaskDto.phaseId ?? null,
          title: createTaskDto.title,
          description: createTaskDto.description ?? null,
          priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
          dueDate: createTaskDto.dueDate ?? null,
          status: TaskStatus.TODO,
        });
        const savedTask = await tasksRepository.save(task);
        const assignees = memberships.map((membership) =>
          taskAssigneesRepository.create({
            taskId: savedTask.id,
            memberId: membership.memberId,
            projectMembershipId: membership.id,
          }),
        );

        await taskAssigneesRepository.save(assignees);

        if (accessActor) {
          await this.auditService.record(
            accessActor,
            {
              action: 'create',
              entityType: 'Task',
              entityId: savedTask.id,
              areaId: project.areaId,
              metadata: { title: savedTask.title },
            },
            entityManager,
          );
        }

        return savedTask.id;
      },
    );

    return this.findOne(taskId, accessActor);
  }

  async findAll(
    filterDto: GetTasksFilterDto,
    accessActor: RequestAccessActor,
  ): Promise<PaginatedResponse<Task>> {
    const project = await this.findProjectOrThrow(filterDto.projectId);
    await this.assertProjectAccess(project, accessActor, 'read');

    if (filterDto.phaseId !== undefined) {
      await this.findPhaseOrThrow(project.id, filterDto.phaseId);
    }

    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;

    const baseWhere: FindOptionsWhere<Task> = {
      projectId: project.id,
      ...(filterDto.assigneeId !== undefined && {
        id: Raw(
          (taskIdAlias) =>
            `EXISTS (SELECT 1 FROM task_assignees task_assignee_filter ` +
            `WHERE task_assignee_filter.task_id = ${taskIdAlias} ` +
            `AND task_assignee_filter.member_id = :assigneeId)`,
          { assigneeId: filterDto.assigneeId },
        ),
      }),
      ...(filterDto.status !== undefined && { status: filterDto.status }),
      ...(filterDto.priority !== undefined && {
        priority: filterDto.priority,
      }),
      ...(filterDto.phaseId !== undefined && {
        phaseId: filterDto.phaseId,
      }),
    };

    let where: FindOptionsWhere<Task> | FindOptionsWhere<Task>[] = baseWhere;
    if (filterDto.search !== undefined && filterDto.search.trim() !== '') {
      const searchPattern = `%${filterDto.search.trim()}%`;
      where = [
        { ...baseWhere, title: ILike(searchPattern) },
        { ...baseWhere, description: ILike(searchPattern) },
      ];
    }

    const [data, total] = await this.tasksRepository.findAndCount({
      where,
      relations: ['project', 'phase', 'assignees', 'assignees.member'],
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    data.forEach((task) => this.limitAssigneeFields(task));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, accessActor: RequestAccessActor): Promise<Task> {
    const task = await this.findTaskOrThrow(id);
    await this.assertProjectAccess(task.project, accessActor, 'read');
    const [comments, statusHistory] = await Promise.all([
      this.loadComments(task.id),
      this.loadStatusHistory(task.id),
    ]);
    task.comments = comments;
    task.statusHistory = statusHistory;
    this.limitAssigneeFields(task);

    return task;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    accessActor: RequestAccessActor,
  ): Promise<Task> {
    if (!Object.values(updateTaskDto).some((value) => value !== undefined)) {
      throw new BadRequestException('At least one task field must be provided');
    }

    await this.tasksRepository.manager.transaction(async (entityManager) => {
      const tasksRepository = entityManager.getRepository(Task);
      const projectPhasesRepository = entityManager.getRepository(ProjectPhase);
      const projectMembershipsRepository =
        entityManager.getRepository(ProjectMembership);
      const task = await this.findTaskForUpdate(id, tasksRepository);
      const project = await this.findProjectOrThrow(
        task.projectId,
        entityManager.getRepository(Project),
      );

      await this.assertProjectAccess(
        project,
        accessActor,
        'manage',
        projectMembershipsRepository,
      );
      this.assertProjectIsActive(project);

      if (
        updateTaskDto.phaseId !== undefined &&
        updateTaskDto.phaseId !== null
      ) {
        await this.findPhaseOrThrow(
          project.id,
          updateTaskDto.phaseId,
          projectPhasesRepository,
        );
      }

      if (updateTaskDto.title !== undefined) {
        task.title = updateTaskDto.title;
      }
      if (updateTaskDto.description !== undefined) {
        task.description = updateTaskDto.description;
      }
      if (updateTaskDto.priority !== undefined) {
        task.priority = updateTaskDto.priority;
      }
      if (updateTaskDto.dueDate !== undefined) {
        task.dueDate = updateTaskDto.dueDate;
      }
      if (updateTaskDto.phaseId !== undefined) {
        task.phaseId = updateTaskDto.phaseId;
      }

      const savedTask = await tasksRepository.save(task);

      if (accessActor) {
        await this.auditService.record(
          accessActor,
          {
            action: 'update',
            entityType: 'Task',
            entityId: savedTask.id,
            areaId: project.areaId,
            metadata: { title: savedTask.title },
          },
          entityManager,
        );
      }
    });

    return this.findOne(id, accessActor);
  }

  async updateStatus(
    id: number,
    updateTaskStatusDto: UpdateTaskStatusDto,
    accessActor: RequestAccessActor,
  ): Promise<Task> {
    await this.tasksRepository.manager.transaction(async (entityManager) => {
      const tasksRepository = entityManager.getRepository(Task);
      const projectMembershipsRepository =
        entityManager.getRepository(ProjectMembership);
      const taskStatusHistoryRepository =
        entityManager.getRepository(TaskStatusHistory);
      const task = await this.findTaskForUpdate(id, tasksRepository);
      const project = await this.findProjectOrThrow(
        task.projectId,
        entityManager.getRepository(Project),
      );

      await this.assertProjectAccess(
        project,
        accessActor,
        'status',
        projectMembershipsRepository,
      );
      this.assertProjectIsActive(project);

      if (
        !STATUS_TRANSITIONS[task.status].includes(updateTaskStatusDto.status)
      ) {
        throw new BadRequestException(
          `Cannot transition task from ${task.status} to ${updateTaskStatusDto.status}`,
        );
      }

      const previousStatus = task.status;
      task.status = updateTaskStatusDto.status;
      await tasksRepository.save(task);
      const historyEntry = await taskStatusHistoryRepository.save(
        taskStatusHistoryRepository.create({
          taskId: task.id,
          previousStatus,
          newStatus: updateTaskStatusDto.status,
          actorId: this.getActorMemberId(accessActor),
        }),
      );

      if (accessActor) {
        await this.auditService.record(
          accessActor,
          {
            action: 'task_status_transition',
            entityType: 'TaskStatusHistory',
            entityId: historyEntry.id,
            areaId: project.areaId,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              previousStatus,
              newStatus: updateTaskStatusDto.status,
            },
          },
          entityManager,
        );
      }
    });

    return this.findOne(id, accessActor);
  }

  async addComment(
    id: number,
    createTaskCommentDto: CreateTaskCommentDto,
    accessActor: RequestAccessActor,
  ): Promise<TaskComment> {
    const task = await this.findTaskForAccessOrThrow(id);
    await this.assertProjectAccess(task.project, accessActor, 'read');
    this.assertProjectIsActive(task.project);

    const savedComment = await this.taskCommentsRepository.save(
      this.taskCommentsRepository.create({
        taskId: task.id,
        authorId: this.getActorMemberId(accessActor),
        content: createTaskCommentDto.content,
      }),
    );

    const comment = await this.taskCommentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException(
        `Task comment with ID ${savedComment.id} not found`,
      );
    }

    this.limitMemberFields(comment, 'author');
    return comment;
  }

  async findComments(
    id: number,
    accessActor: RequestAccessActor,
  ): Promise<TaskComment[]> {
    const task = await this.findTaskForAccessOrThrow(id);
    await this.assertProjectAccess(task.project, accessActor, 'read');

    const comments = await this.loadComments(task.id);
    comments.forEach((comment) => this.limitMemberFields(comment, 'author'));
    return comments;
  }

  async findStatusHistory(
    id: number,
    accessActor: RequestAccessActor,
  ): Promise<TaskStatusHistory[]> {
    const task = await this.findTaskForAccessOrThrow(id);
    await this.assertProjectAccess(task.project, accessActor, 'read');

    const history = await this.loadStatusHistory(task.id);
    history.forEach((entry) => this.limitMemberFields(entry, 'actor'));
    return history;
  }

  async setAssignees(
    id: number,
    setTaskAssigneesDto: SetTaskAssigneesDto,
    accessActor: RequestAccessActor,
  ): Promise<Task> {
    await this.tasksRepository.manager.transaction(async (entityManager) => {
      const tasksRepository = entityManager.getRepository(Task);
      const taskAssigneesRepository = entityManager.getRepository(TaskAssignee);
      const projectMembershipsRepository =
        entityManager.getRepository(ProjectMembership);
      const task = await this.findTaskForUpdate(id, tasksRepository);
      const project = await this.findProjectOrThrow(
        task.projectId,
        entityManager.getRepository(Project),
      );

      await this.assertProjectAccess(
        project,
        accessActor,
        'manage',
        projectMembershipsRepository,
      );
      this.assertProjectIsActive(project);

      const memberships = await this.validateAssignees(
        project.id,
        setTaskAssigneesDto.memberIds,
        projectMembershipsRepository,
      );

      await taskAssigneesRepository.delete({ taskId: task.id });
      await taskAssigneesRepository.save(
        memberships.map((membership) =>
          taskAssigneesRepository.create({
            taskId: task.id,
            memberId: membership.memberId,
            projectMembershipId: membership.id,
          }),
        ),
      );

      if (accessActor) {
        await this.auditService.record(
          accessActor,
          {
            action: 'task_assignment',
            entityType: 'TaskAssignee',
            entityId: task.id,
            areaId: project.areaId,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              assigneeMemberIds: setTaskAssigneesDto.memberIds,
            },
          },
          entityManager,
        );
      }
    });

    return this.findOne(id, accessActor);
  }

  private async findTaskOrThrow(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'phase', 'assignees', 'assignees.member'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  private async findTaskForAccessOrThrow(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  private loadComments(taskId: number): Promise<TaskComment[]> {
    return this.taskCommentsRepository.find({
      where: { taskId },
      relations: ['author'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private loadStatusHistory(taskId: number): Promise<TaskStatusHistory[]> {
    return this.taskStatusHistoryRepository.find({
      where: { taskId },
      relations: ['actor'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  private async findTaskForUpdate(
    id: number,
    tasksRepository: Repository<Task>,
  ): Promise<Task> {
    const task = await tasksRepository.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  private async findProjectOrThrow(
    id: number,
    projectsRepository: Repository<Project> = this.projectsRepository,
    lock = false,
  ): Promise<Project> {
    const project = await projectsRepository.findOne({
      where: { id },
      ...(lock && { lock: { mode: 'pessimistic_write' as const } }),
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  private async findPhaseOrThrow(
    projectId: number,
    phaseId: number,
    projectPhasesRepository: Repository<ProjectPhase> = this
      .projectPhasesRepository,
  ): Promise<ProjectPhase> {
    const phase = await projectPhasesRepository.findOne({
      where: { id: phaseId, projectId },
    });

    if (!phase) {
      throw new BadRequestException(
        `Project phase with ID ${phaseId} does not belong to project ${projectId}`,
      );
    }

    return phase;
  }

  private async validateAssignees(
    projectId: number,
    memberIds: number[],
    projectMembershipsRepository: Repository<ProjectMembership> = this
      .projectMembershipsRepository,
  ): Promise<ProjectMembership[]> {
    if (
      memberIds.length === 0 ||
      new Set(memberIds).size !== memberIds.length
    ) {
      throw new BadRequestException(
        'Task assignees must contain unique project members',
      );
    }

    const memberships = await projectMembershipsRepository.find({
      where: { projectId, memberId: In(memberIds) },
      relations: ['member'],
    });
    const membershipsByMemberId = new Map(
      memberships.map((membership) => [membership.memberId, membership]),
    );
    const missingMemberId = memberIds.find(
      (memberId) => !membershipsByMemberId.has(memberId),
    );

    if (missingMemberId !== undefined) {
      throw new BadRequestException(
        `Member ${missingMemberId} does not belong to project ${projectId}`,
      );
    }

    const ineligibleMembership = memberships.find(
      ({ member }) =>
        member.activityStatus !== MemberActivityStatus.ACTIVE ||
        member.availabilityStatus !== MemberAvailabilityStatus.AVAILABLE,
    );

    if (ineligibleMembership) {
      throw new BadRequestException(
        `Member ${ineligibleMembership.memberId} is not eligible for task assignment`,
      );
    }

    return memberIds.map(
      (memberId) => membershipsByMemberId.get(memberId) as ProjectMembership,
    );
  }

  private async assertProjectAccess(
    project: Project,
    accessActor: RequestAccessActor,
    mode: TaskAccessMode,
    projectMembershipsRepository: Repository<ProjectMembership> = this
      .projectMembershipsRepository,
  ): Promise<void> {
    if (accessActor.role === AreaRole.PRESIDENCIA) {
      return;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      if (String(project.areaId) === accessActor.areaId) {
        return;
      }

      throw new ForbiddenException(
        'Task access is limited to projects in your own area',
      );
    }

    const memberId = Number(accessActor.memberId);
    if (!Number.isSafeInteger(memberId) || memberId < 1) {
      throw new ForbiddenException(
        'Task access requires authenticated project participation',
      );
    }

    const membership = await projectMembershipsRepository.findOne({
      where: { projectId: project.id, memberId },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Task access is limited to projects where you participate',
      );
    }

    if (
      mode === 'manage' &&
      ![ProjectRole.REPRESENTATIVE, ProjectRole.SUBREPRESENTATIVE].includes(
        membership.role,
      )
    ) {
      throw new ForbiddenException(
        'Task management requires a project representative role',
      );
    }
  }

  private assertProjectIsActive(project: Project): void {
    if (project.isArchived) {
      throw new BadRequestException('Archived projects cannot modify tasks');
    }
  }

  private limitAssigneeFields(task: Task): void {
    task.assignees?.sort((a, b) => a.memberId - b.memberId);
    task.assignees?.forEach((assignee) => {
      if (!assignee.member) {
        return;
      }

      const { id, firstNames, lastNames } = assignee.member;
      assignee.member = { id, firstNames, lastNames } as Member;
    });
    task.comments?.forEach((comment) =>
      this.limitMemberFields(comment, 'author'),
    );
    task.statusHistory?.forEach((entry) =>
      this.limitMemberFields(entry, 'actor'),
    );
  }

  private getActorMemberId(accessActor: RequestAccessActor): number {
    const memberId = Number(accessActor.memberId);
    if (!Number.isSafeInteger(memberId) || memberId < 1) {
      throw new ForbiddenException('Task collaboration requires an actor');
    }
    return memberId;
  }

  private limitMemberFields(
    resource: TaskComment | TaskStatusHistory,
    relation: 'author' | 'actor',
  ): void {
    const member =
      relation === 'author'
        ? (resource as TaskComment).author
        : (resource as TaskStatusHistory).actor;
    if (!member) {
      return;
    }

    const { id, firstNames, lastNames } = member;
    if (relation === 'author') {
      (resource as TaskComment).author = {
        id,
        firstNames,
        lastNames,
      } as Member;
    } else {
      (resource as TaskStatusHistory).actor = {
        id,
        firstNames,
        lastNames,
      } as Member;
    }
  }
}
