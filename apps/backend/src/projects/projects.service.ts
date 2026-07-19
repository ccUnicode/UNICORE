import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AreaRole } from '../common/enums/area-role.enum';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { Member } from '../members/member.entity';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectMembership } from './entities/project-membership.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhasesRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMembership)
    private readonly projectMembershipsRepository: Repository<ProjectMembership>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly areaService: AreaService,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    this.validateDateRange(createProjectDto);

    const area = await this.areaService.findOne(createProjectDto.areaId);
    const project = this.projectsRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description ?? null,
      startDate: createProjectDto.startDate ?? null,
      endDate: createProjectDto.endDate ?? null,
      areaId: area.id,
      area,
    });

    return this.projectsRepository.manager.transaction(
      async (entityManager) => {
        const savedProject = await entityManager
          .getRepository(Project)
          .save(project);

        savedProject.phases = await this.createDefaultPhases(
          savedProject,
          entityManager.getRepository(ProjectPhase),
        );

        return savedProject;
      },
    );
  }

  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResponse<Project>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.projectsRepository.findAndCount({
      relations: ['area'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

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

  async findOne(
    id: number,
    accessActor: RequestAccessActor,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['area', 'phases', 'memberships', 'memberships.member'],
      order: {
        phases: {
          orderIndex: 'ASC',
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    this.checkProjectReadPermission(project, accessActor);
    this.sortMembershipsByActivity(project);

    return project;
  }

  async findPhases(
    projectId: number,
    accessActor: RequestAccessActor,
  ): Promise<ProjectPhase[]> {
    const project = await this.ensureProjectExists(projectId);
    this.checkProjectReadPermission(project, accessActor);

    return this.findProjectPhases(projectId);
  }

  async createPhase(
    projectId: number,
    createProjectPhaseDto: CreateProjectPhaseDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectPhase> {
    return this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        const projectsRepository = entityManager.getRepository(Project);
        const projectPhasesRepository =
          entityManager.getRepository(ProjectPhase);
        const project = await this.findProjectForUpdate(
          projectId,
          projectsRepository,
        );
        this.checkProjectAreaPermission(
          project,
          accessActor,
          "manage this project's phases",
        );
        const nextOrderIndex = await this.getNextPhaseOrderIndex(
          projectId,
          projectPhasesRepository,
        );
        const phase = projectPhasesRepository.create({
          name: createProjectPhaseDto.name,
          description: createProjectPhaseDto.description ?? null,
          orderIndex: nextOrderIndex,
          projectId: project.id,
        });

        return projectPhasesRepository.save(phase);
      },
    );
  }

  async updatePhase(
    projectId: number,
    phaseId: number,
    updateProjectPhaseDto: UpdateProjectPhaseDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectPhase> {
    const project = await this.ensureProjectExists(projectId);
    this.checkProjectAreaPermission(
      project,
      accessActor,
      "manage this project's phases",
    );
    await this.findPhaseOrThrow(projectId, phaseId);
    const phaseUpdate: Partial<Pick<ProjectPhase, 'name' | 'description'>> = {};

    if (updateProjectPhaseDto.name !== undefined) {
      phaseUpdate.name = updateProjectPhaseDto.name;
    }

    if (updateProjectPhaseDto.description !== undefined) {
      phaseUpdate.description = updateProjectPhaseDto.description;
    }

    if (Object.keys(phaseUpdate).length > 0) {
      await this.projectPhasesRepository.update(
        { id: phaseId, projectId },
        phaseUpdate,
      );
    }

    return this.findPhaseOrThrow(projectId, phaseId);
  }

  async reorderPhases(
    projectId: number,
    reorderProjectPhasesDto: ReorderProjectPhasesDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectPhase[]> {
    return this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        const project = await this.findProjectForUpdate(
          projectId,
          entityManager.getRepository(Project),
        );
        this.checkProjectAreaPermission(
          project,
          accessActor,
          "manage this project's phases",
        );
        const projectPhasesRepository =
          entityManager.getRepository(ProjectPhase);
        const phases = await this.findProjectPhases(
          projectId,
          projectPhasesRepository,
        );
        const phaseIds = reorderProjectPhasesDto.phaseIds;
        const uniquePhaseIds = new Set(phaseIds);
        const phasesById = new Map(phases.map((phase) => [phase.id, phase]));

        if (
          phases.length !== phaseIds.length ||
          uniquePhaseIds.size !== phaseIds.length ||
          phaseIds.some((phaseId) => !phasesById.has(phaseId))
        ) {
          throw new BadRequestException(
            'phaseIds must include every project phase exactly once',
          );
        }

        const reorderedPhases = phaseIds.map((phaseId, index) => {
          const phase = phasesById.get(phaseId) as ProjectPhase;
          return {
            id: phase.id,
            orderIndex: index + 1,
          };
        });

        await projectPhasesRepository.save(reorderedPhases);

        return this.findProjectPhases(projectId, projectPhasesRepository);
      },
    );
  }

  async deletePhase(
    projectId: number,
    phaseId: number,
    accessActor: RequestAccessActor,
  ): Promise<void> {
    await this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        const project = await this.findProjectForUpdate(
          projectId,
          entityManager.getRepository(Project),
        );
        this.checkProjectAreaPermission(
          project,
          accessActor,
          "manage this project's phases",
        );
        const projectPhasesRepository =
          entityManager.getRepository(ProjectPhase);
        const phases = await this.findProjectPhases(
          projectId,
          projectPhasesRepository,
        );
        const phase = phases.find(
          (currentPhase) => currentPhase.id === phaseId,
        );

        if (!phase) {
          throw new NotFoundException(
            `Project phase with ID ${phaseId} not found in project ${projectId}`,
          );
        }

        if (phases.length === 1) {
          throw new BadRequestException(
            'Projects must keep at least one phase',
          );
        }

        const remainingPhases = phases
          .filter((currentPhase) => currentPhase.id !== phaseId)
          .map((currentPhase, index) => {
            return {
              id: currentPhase.id,
              orderIndex: index + 1,
            };
          });

        await projectPhasesRepository.remove(phase);
        await projectPhasesRepository.save(remainingPhases);
      },
    );
  }

  async addTeamMember(
    projectId: number,
    addDto: AddProjectMemberDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectMembership> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['area'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    this.checkProjectAreaPermission(
      project,
      accessActor,
      "manage this project's team",
    );

    const member = await this.membersRepository.findOne({
      where: { id: addDto.memberId },
      relations: ['memberships'],
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${addDto.memberId} not found`,
      );
    }

    if (member.availabilityStatus !== MemberAvailabilityStatus.AVAILABLE) {
      throw new BadRequestException(
        'Members marked as unavailable are not selectable when building a team',
      );
    }

    const belongsToArea = member.memberships?.some(
      (membership) => membership.areaId === project.areaId,
    );
    if (!belongsToArea) {
      throw new BadRequestException(
        'A member can only be assigned to a project of their own area',
      );
    }

    const existingMembership = await this.projectMembershipsRepository.findOne({
      where: { projectId, memberId: addDto.memberId },
    });

    if (existingMembership) {
      throw new ConflictException('Member is already assigned to this project');
    }

    const membership = this.projectMembershipsRepository.create({
      projectId,
      memberId: addDto.memberId,
      role: addDto.role,
    });

    try {
      const saved = await this.projectMembershipsRepository.save(membership);
      return this.projectMembershipsRepository.findOne({
        where: { id: saved.id },
        relations: ['member'],
      }) as Promise<ProjectMembership>;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Member is already assigned to this project',
        );
      }
      throw error;
    }
  }

  async updateTeamMemberRole(
    projectId: number,
    memberId: number,
    updateDto: UpdateProjectMemberDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectMembership> {
    const project = await this.ensureProjectExists(projectId);
    this.checkProjectAreaPermission(
      project,
      accessActor,
      "manage this project's team",
    );

    const membership = await this.projectMembershipsRepository.findOne({
      where: { projectId, memberId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership for member ${memberId} in project ${projectId} not found`,
      );
    }

    membership.role = updateDto.role;
    const saved = await this.projectMembershipsRepository.save(membership);

    return this.projectMembershipsRepository.findOne({
      where: { id: saved.id },
      relations: ['member'],
    }) as Promise<ProjectMembership>;
  }

  async removeTeamMember(
    projectId: number,
    memberId: number,
    accessActor: RequestAccessActor,
  ): Promise<void> {
    const project = await this.ensureProjectExists(projectId);
    this.checkProjectAreaPermission(
      project,
      accessActor,
      "manage this project's team",
    );

    const membership = await this.projectMembershipsRepository.findOne({
      where: { projectId, memberId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership for member ${memberId} in project ${projectId} not found`,
      );
    }

    await this.projectMembershipsRepository.remove(membership);
  }

  private validateDateRange(createProjectDto: CreateProjectDto): void {
    const { startDate, endDate } = createProjectDto;

    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
  }

  private createDefaultPhases(
    project: Project,
    projectPhasesRepository: Repository<ProjectPhase>,
  ): Promise<ProjectPhase[]> {
    const phases = DEFAULT_PROJECT_PHASES.map((name, index) =>
      projectPhasesRepository.create({
        name,
        description: null,
        orderIndex: index + 1,
        projectId: project.id,
      }),
    );

    return projectPhasesRepository.save(phases);
  }

  private async ensureProjectExists(
    projectId: number,
    projectsRepository: Repository<Project> = this.projectsRepository,
  ): Promise<Project> {
    const project = await projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return project;
  }

  private async findProjectForUpdate(
    projectId: number,
    projectsRepository: Repository<Project>,
  ): Promise<Project> {
    const project = await projectsRepository.findOne({
      where: { id: projectId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return project;
  }

  private async findPhaseOrThrow(
    projectId: number,
    phaseId: number,
  ): Promise<ProjectPhase> {
    const phase = await this.projectPhasesRepository.findOne({
      where: { id: phaseId, projectId },
    });

    if (!phase) {
      throw new NotFoundException(
        `Project phase with ID ${phaseId} not found in project ${projectId}`,
      );
    }

    return phase;
  }

  private findProjectPhases(
    projectId: number,
    projectPhasesRepository: Repository<ProjectPhase> = this
      .projectPhasesRepository,
  ): Promise<ProjectPhase[]> {
    return projectPhasesRepository.find({
      where: { projectId },
      order: { orderIndex: 'ASC' },
    });
  }

  private async getNextPhaseOrderIndex(
    projectId: number,
    projectPhasesRepository: Repository<ProjectPhase> = this
      .projectPhasesRepository,
  ): Promise<number> {
    const lastPhase = await projectPhasesRepository.findOne({
      where: { projectId },
      order: { orderIndex: 'DESC' },
    });

    return (lastPhase?.orderIndex ?? 0) + 1;
  }

  private checkProjectReadPermission(
    project: Project,
    accessActor: RequestAccessActor,
  ): void {
    if (accessActor.role === AreaRole.PRESIDENCIA) {
      return;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      if (project.areaId !== Number(accessActor.areaId)) {
        throw new ForbiddenException(
          'Area-scoped access is limited to your own area',
        );
      }
      return;
    }

    if (accessActor.role === AreaRole.MIEMBRO) {
      const projectIds = accessActor.projectIds?.map(Number) || [];
      if (!projectIds.includes(project.id)) {
        throw new ForbiddenException(
          'Project-scoped access is limited to your own projects',
        );
      }
      return;
    }

    throw new ForbiddenException('You do not have permission to view project');
  }

  private checkProjectAreaPermission(
    project: Project,
    accessActor: RequestAccessActor,
    action = "manage this project's team",
  ): void {
    if (accessActor.role === AreaRole.PRESIDENCIA) {
      return;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      if (project.areaId !== Number(accessActor.areaId)) {
        throw new ForbiddenException(`You do not have permission to ${action}`);
      }
      return;
    }

    throw new ForbiddenException(`You do not have permission to ${action}`);
  }

  private sortMembershipsByActivity(project: Project): void {
    project.memberships?.sort((a, b) => {
      const aInactive =
        a.member?.activityStatus === MemberActivityStatus.INACTIVE;
      const bInactive =
        b.member?.activityStatus === MemberActivityStatus.INACTIVE;
      if (aInactive && !bInactive) return 1;
      if (!aInactive && bInactive) return -1;
      return 0;
    });
  }
}
