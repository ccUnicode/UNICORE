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
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';
import { ProjectMembership } from './entities/project-membership.entity';
import { Member } from '../members/member.entity';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { AreaRole } from '../common/enums/area-role.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { isUniqueViolation } from '../common/utils/database-errors.util';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
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

    return this.projectsRepository.save(project);
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

  async findOne(id: number, accessActor: RequestAccessActor): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['area', 'memberships', 'memberships.member'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Verify access
    if (
      accessActor.role === AreaRole.DIRECTIVA_DE_AREA &&
      project.areaId !== Number(accessActor.areaId)
    ) {
      throw new ForbiddenException(
        'Area-scoped access is limited to your own area',
      );
    }

    if (accessActor.role === AreaRole.MIEMBRO) {
      const projectIds = accessActor.projectIds?.map(Number) || [];
      if (!projectIds.includes(project.id)) {
        throw new ForbiddenException(
          'Project-scoped access is limited to your own projects',
        );
      }
    }

    // Sort memberships: inactive members at the end
    if (project.memberships) {
      project.memberships.sort((a, b) => {
        const aInactive =
          a.member?.activityStatus === MemberActivityStatus.INACTIVE;
        const bInactive =
          b.member?.activityStatus === MemberActivityStatus.INACTIVE;
        if (aInactive && !bInactive) return 1;
        if (!aInactive && bInactive) return -1;
        return 0;
      });
    }

    return project;
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

    // Authorization check
    this.checkProjectAreaPermission(
      project,
      accessActor,
      "manage this project's team",
    );

    // Fetch member
    const member = await this.membersRepository.findOne({
      where: { id: addDto.memberId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${addDto.memberId} not found`,
      );
    }

    // Eligibility check 1: availability
    if (member.availabilityStatus !== MemberAvailabilityStatus.AVAILABLE) {
      throw new BadRequestException(
        'Members marked as unavailable are not selectable when building a team',
      );
    }

    // Eligibility check 2: member must belong to the same area as the project
    if (member.areaId !== project.areaId) {
      throw new BadRequestException(
        'A member can only be assigned to a project of their own area',
      );
    }

    // Check if membership already exists
    const existingMembership = await this.projectMembershipsRepository.findOne({
      where: { projectId, memberId: addDto.memberId },
    });

    if (existingMembership) {
      throw new ConflictException('Member is already assigned to this project');
    }

    // Create and save membership
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

  async removeTeamMember(
    projectId: number,
    memberId: number,
    accessActor: RequestAccessActor,
  ): Promise<void> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Authorization check
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

  async updateTeamMemberRole(
    projectId: number,
    memberId: number,
    updateDto: UpdateProjectMemberDto,
    accessActor: RequestAccessActor,
  ): Promise<ProjectMembership> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Authorization check
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
}
