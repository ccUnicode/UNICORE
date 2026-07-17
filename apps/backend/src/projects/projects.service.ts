import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { DEFAULT_PROJECT_PHASES } from './constants/default-project-phases.constant';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectPhase } from './entities/project-phase.entity';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhasesRepository: Repository<ProjectPhase>,
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

  async findOne(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['area', 'phases'],
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

  async findPhases(projectId: number): Promise<ProjectPhase[]> {
    await this.ensureProjectExists(projectId);

    return this.projectPhasesRepository.find({
      where: { projectId },
      order: { orderIndex: 'ASC' },
    });
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
    const phase = await this.findPhaseOrThrow(projectId, phaseId);

    if (updateProjectPhaseDto.name !== undefined) {
      phase.name = updateProjectPhaseDto.name;
    }

    if (updateProjectPhaseDto.description !== undefined) {
      phase.description = updateProjectPhaseDto.description;
    }

    return this.projectPhasesRepository.save(phase);
  }

  async reorderPhases(
    projectId: number,
    reorderProjectPhasesDto: ReorderProjectPhasesDto,
  ): Promise<ProjectPhase[]> {
    const phases = await this.findPhases(projectId);
    const phaseIds = reorderProjectPhasesDto.phaseIds;
    const phasesById = new Map(phases.map((phase) => [phase.id, phase]));

    if (
      phases.length !== phaseIds.length ||
      phaseIds.some((phaseId) => !phasesById.has(phaseId))
    ) {
      throw new BadRequestException(
        'phaseIds must include every project phase exactly once',
      );
    }

    const reorderedPhases = phaseIds.map((phaseId, index) => {
      const phase = phasesById.get(phaseId) as ProjectPhase;
      phase.orderIndex = index + 1;
      return phase;
    });

    await this.projectPhasesRepository.save(reorderedPhases);

    return reorderedPhases;
  }

  async deletePhase(projectId: number, phaseId: number): Promise<void> {
    const phases = await this.findPhases(projectId);
    const phase = phases.find((currentPhase) => currentPhase.id === phaseId);

    if (!phase) {
      throw new NotFoundException(
        `Project phase with ID ${phaseId} not found in project ${projectId}`,
      );
    }

    if (phases.length === 1) {
      throw new BadRequestException('Projects must keep at least one phase');
    }

    const remainingPhases = phases
      .filter((currentPhase) => currentPhase.id !== phaseId)
      .map((currentPhase, index) => {
        currentPhase.orderIndex = index + 1;
        return currentPhase;
      });

    await this.projectPhasesRepository.manager.transaction(
      async (entityManager) => {
        const projectPhasesRepository =
          entityManager.getRepository(ProjectPhase);

        await projectPhasesRepository.remove(phase);
        await projectPhasesRepository.save(remainingPhases);
      },
    );
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
