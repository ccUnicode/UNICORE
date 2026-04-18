import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { AreaMembership } from './entities/area-membership.entity';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { Area } from '../area/entities/area.entity';
import { Member } from '../members/member.entity';

type DatabaseErrorWithCode = {
  code: string;
};

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
      const databaseError =
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError
          ? (error.driverError as DatabaseErrorWithCode)
          : null;

      if (databaseError?.code === '23505') {
        throw new ConflictException(
          `Member ${memberId} is already assigned to Area ${areaId}`,
        );
      }

      throw error;
    }
  }

  findAll(): Promise<AreaMembership[]> {
    return this.areaMembershipsRepository.find({
      relations: ['member', 'area'],
    });
  }
}
