import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaService } from '../area/area.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
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
