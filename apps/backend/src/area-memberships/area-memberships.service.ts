import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaMembership } from './entities/area-membership.entity';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { Area } from '../area/entities/area.entity';
import { Member } from '../members/member.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { UpdateAreaMembershipDto } from './dto/update-area-membership.dto';
import { ProjectMembership } from '../projects/entities/project-membership.entity';

@Injectable()
export class AreaMembershipsService {
  constructor(
    @InjectRepository(AreaMembership)
    private readonly areaMembershipsRepository: Repository<AreaMembership>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Area)
    private readonly areasRepository: Repository<Area>,
    @InjectRepository(ProjectMembership)
    private readonly projectMembershipsRepository: Repository<ProjectMembership>,
  ) {}

  async create(
    createAreaMembershipDto: CreateAreaMembershipDto,
  ): Promise<AreaMembership> {
    const { memberId, areaId, role } = createAreaMembershipDto;

    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const area = await this.areasRepository.findOne({
      where: { id: areaId, isArchived: false },
    });
    if (!area) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    const membership = this.areaMembershipsRepository.create({
      member,
      area,
      role,
    });

    try {
      return await this.areaMembershipsRepository.save(membership);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Member ${memberId} is already assigned to Area ${areaId}`,
        );
      }

      throw error;
    }
  }

  async update(
    id: number,
    updateAreaMembershipDto: UpdateAreaMembershipDto,
  ): Promise<AreaMembership> {
    const membership = await this.areaMembershipsRepository.findOne({
      where: { id },
      relations: ['member', 'area'],
    });
    if (!membership) {
      throw new NotFoundException(`Area membership with ID ${id} not found`);
    }

    if (
      updateAreaMembershipDto.areaId !== undefined &&
      updateAreaMembershipDto.areaId !== membership.areaId
    ) {
      await this.assertMembershipCanLeaveArea(membership);
      const area = await this.areasRepository.findOne({
        where: {
          id: updateAreaMembershipDto.areaId,
          isArchived: false,
        },
      });
      if (!area) {
        throw new NotFoundException(
          `Area with ID ${updateAreaMembershipDto.areaId} not found`,
        );
      }
      membership.area = area;
    }

    if (updateAreaMembershipDto.role !== undefined) {
      membership.role = updateAreaMembershipDto.role;
    }

    try {
      return await this.areaMembershipsRepository.save(membership);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Member ${membership.memberId} is already assigned to Area ${updateAreaMembershipDto.areaId}`,
        );
      }

      throw error;
    }
  }

  async remove(id: number): Promise<AreaMembership> {
    const membership = await this.areaMembershipsRepository.findOne({
      where: { id },
      relations: ['member', 'area'],
    });
    if (!membership) {
      throw new NotFoundException(`Area membership with ID ${id} not found`);
    }

    await this.assertMembershipCanLeaveArea(membership);
    return this.areaMembershipsRepository.remove(membership);
  }

  private async assertMembershipCanLeaveArea(
    membership: AreaMembership,
  ): Promise<void> {
    if (membership.areaId === null) {
      return;
    }

    const assignedProject = await this.projectMembershipsRepository.findOne({
      where: {
        memberId: membership.memberId,
        project: {
          areaId: membership.areaId,
          isArchived: false,
        },
      },
      relations: ['project'],
    });

    if (assignedProject) {
      throw new BadRequestException(
        'Remove the member from active project teams in this area before changing or removing the area membership',
      );
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AreaMembership>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.areaMembershipsRepository.findAndCount({
      relations: ['member', 'area'],
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
}
