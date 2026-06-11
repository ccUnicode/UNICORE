import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { AreaMembership } from './entities/area-membership.entity';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { Area } from '../area/entities/area.entity';
import { Member } from '../members/member.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AreaMembershipsService {
  constructor(
    @InjectRepository(AreaMembership)
    private readonly areaMembershipsRepository: Repository<AreaMembership>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Area)
    private readonly areasRepository: Repository<Area>,
  ) {}

  async create(createAreaMembershipDto: CreateAreaMembershipDto): Promise<AreaMembership> {
    const { memberId, areaId, role } = createAreaMembershipDto;

    const member = await this.membersRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const area = await this.areasRepository.findOne({ where: { id: areaId } });
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
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
