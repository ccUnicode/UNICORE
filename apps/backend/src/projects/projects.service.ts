import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AreaService } from '../area/area.service';
import { AreaRole } from '../common/enums/area-role.enum';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { parseAreaId } from '../common/utils/parse-area-id.util';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectLinkDto } from './dto/create-project-link.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectLabel } from './entities/project-label.entity';
import { ProjectLink } from './entities/project-link.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';
import { ProjectStatus } from './enums/project-status.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhasesRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectLabel)
    private readonly projectLabelsRepository: Repository<ProjectLabel>,
    @InjectRepository(ProjectLink)
    private readonly projectLinksRepository: Repository<ProjectLink>,
    private readonly areaService: AreaService,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    this.validateDateRange(createProjectDto);

    const area = await this.areaService.findOne(createProjectDto.areaId);
    return this.projectsRepository.manager.transaction(
      async (entityManager) => {
        const projectsRepository = entityManager.getRepository(Project);
        const labels = await this.resolveLabels(
          createProjectDto.labels ?? [],
          entityManager.getRepository(ProjectLabel),
        );
        const project = projectsRepository.create({
          name: createProjectDto.name,
          description: createProjectDto.description ?? null,
          startDate: createProjectDto.startDate ?? null,
          endDate: createProjectDto.endDate ?? null,
          areaId: area.id,
          area,
          status: createProjectDto.status ?? ProjectStatus.PLANNED,
          isArchived: false,
          labels,
        });
        const savedProject = await projectsRepository.save(project);

        savedProject.phases = await this.createDefaultPhases(
          savedProject,
          entityManager.getRepository(ProjectPhase),
        );
        savedProject.links = await this.replaceLinks(
          savedProject,
          createProjectDto.links ?? [],
          entityManager.getRepository(ProjectLink),
        );
        savedProject.labels = labels;

        return savedProject;
      },
    );
  }

  async findAll(
    filterDto: GetProjectsFilterDto = {},
    accessActor?: RequestAccessActor,
  ): Promise<PaginatedResponse<Project>> {
    this.validateDateRange({
      startDate: filterDto.dateFrom,
      endDate: filterDto.dateTo,
    });

    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = this.buildProjectFilters(filterDto, accessActor);

    const [data, total] = await this.projectsRepository.findAndCount({
      where,
      relations: ['area', 'labels', 'links'],
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

  async findOne(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['area', 'phases', 'labels', 'links'],
      order: {
        phases: {
          orderIndex: 'ASC',
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    const startDate = updateProjectDto.startDate ?? project.startDate;
    const endDate = updateProjectDto.endDate ?? project.endDate;

    this.validateDateRange({ startDate, endDate });

    const area =
      updateProjectDto.areaId !== undefined
        ? await this.areaService.findOne(updateProjectDto.areaId)
        : project.area;

    await this.projectsRepository.manager.transaction(async (entityManager) => {
      const projectsRepository = entityManager.getRepository(Project);

      if (updateProjectDto.name !== undefined) {
        project.name = updateProjectDto.name;
      }
      if (updateProjectDto.description !== undefined) {
        project.description = updateProjectDto.description;
      }
      if (updateProjectDto.startDate !== undefined) {
        project.startDate = updateProjectDto.startDate;
      }
      if (updateProjectDto.endDate !== undefined) {
        project.endDate = updateProjectDto.endDate;
      }
      if (updateProjectDto.areaId !== undefined) {
        project.areaId = area.id;
        project.area = area;
      }
      if (updateProjectDto.status !== undefined) {
        project.status = updateProjectDto.status;
      }
      if (updateProjectDto.labels !== undefined) {
        project.labels = await this.resolveLabels(
          updateProjectDto.labels,
          entityManager.getRepository(ProjectLabel),
        );
      }

      await projectsRepository.save(project);

      if (updateProjectDto.links !== undefined) {
        await this.replaceLinks(
          project,
          updateProjectDto.links,
          entityManager.getRepository(ProjectLink),
          true,
        );
      }
    });

    return this.findOne(id);
  }

  async archive(id: number): Promise<Project> {
    const project = await this.findOne(id);
    project.isArchived = true;

    return this.projectsRepository.save(project);
  }

  async findPhases(projectId: number): Promise<ProjectPhase[]> {
    await this.ensureProjectExists(projectId);

    return this.findProjectPhases(projectId);
  }

  async createPhase(
    projectId: number,
    createProjectPhaseDto: CreateProjectPhaseDto,
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

  async updatePhase(
    projectId: number,
    phaseId: number,
    updateProjectPhaseDto: UpdateProjectPhaseDto,
  ): Promise<ProjectPhase> {
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
  ): Promise<ProjectPhase[]> {
    return this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        await this.findProjectForUpdate(
          projectId,
          entityManager.getRepository(Project),
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

  async deletePhase(projectId: number, phaseId: number): Promise<void> {
    await this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        await this.findProjectForUpdate(
          projectId,
          entityManager.getRepository(Project),
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

  private validateDateRange(dateRange: {
    startDate?: string | null;
    endDate?: string | null;
  }): void {
    const { startDate, endDate } = dateRange;

    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
  }

  private buildProjectFilters(
    filterDto: GetProjectsFilterDto,
    accessActor?: RequestAccessActor,
  ): FindOptionsWhere<Project> {
    const where: FindOptionsWhere<Project> = {
      isArchived: filterDto.archived ?? false,
    };

    if (filterDto.status) {
      where.status = filterDto.status;
    }
    if (filterDto.areaId !== undefined) {
      where.areaId = filterDto.areaId;
    }
    if (filterDto.search) {
      where.name = ILike(`%${filterDto.search}%`);
    }
    if (filterDto.dateFrom) {
      where.endDate = MoreThanOrEqual(filterDto.dateFrom);
    }
    if (filterDto.dateTo) {
      where.startDate = LessThanOrEqual(filterDto.dateTo);
    }
    if (filterDto.labels?.length) {
      where.labels = {
        normalizedName: In(
          filterDto.labels.map((label) => this.normalizeLabel(label)),
        ),
      };
    }

    if (accessActor?.role === AreaRole.DIRECTIVA_DE_AREA) {
      where.areaId = parseAreaId(accessActor.areaId);
    }
    if (accessActor?.role === AreaRole.MIEMBRO) {
      const projectIds = (accessActor.projectIds ?? [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);
      where.id = In(projectIds.length > 0 ? projectIds : [-1]);
    }

    return where;
  }

  private async resolveLabels(
    labelNames: string[],
    projectLabelsRepository: Repository<ProjectLabel> = this
      .projectLabelsRepository,
  ): Promise<ProjectLabel[]> {
    const labelsByNormalizedName = new Map<string, string>();

    labelNames.forEach((name) => {
      const trimmedName = name.trim();
      labelsByNormalizedName.set(this.normalizeLabel(trimmedName), trimmedName);
    });

    const normalizedNames = [...labelsByNormalizedName.keys()];

    if (normalizedNames.length === 0) {
      return [];
    }

    const existingLabels = await projectLabelsRepository.find({
      where: { normalizedName: In(normalizedNames) },
    });
    const existingNames = new Set(
      existingLabels.map((label) => label.normalizedName),
    );
    const newLabels = normalizedNames
      .filter((normalizedName) => !existingNames.has(normalizedName))
      .map((normalizedName) =>
        projectLabelsRepository.create({
          name: labelsByNormalizedName.get(normalizedName),
          normalizedName,
        }),
      );
    const savedLabels =
      newLabels.length > 0 ? await projectLabelsRepository.save(newLabels) : [];
    const allLabels = [...existingLabels, ...savedLabels];
    const labelsByName = new Map(
      allLabels.map((label) => [label.normalizedName, label]),
    );

    return normalizedNames.map(
      (normalizedName) => labelsByName.get(normalizedName) as ProjectLabel,
    );
  }

  private async replaceLinks(
    project: Project,
    links: CreateProjectLinkDto[],
    projectLinksRepository: Repository<ProjectLink> = this
      .projectLinksRepository,
    removeExisting = false,
  ): Promise<ProjectLink[]> {
    if (removeExisting) {
      await projectLinksRepository.delete({ projectId: project.id });
    }

    if (links.length === 0) {
      return [];
    }

    const projectLinks = links.map((link) =>
      projectLinksRepository.create({
        name: link.name,
        url: link.url,
        projectId: project.id,
      }),
    );

    return projectLinksRepository.save(projectLinks);
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLocaleLowerCase();
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

  private async ensureProjectExists(projectId: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
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
}
