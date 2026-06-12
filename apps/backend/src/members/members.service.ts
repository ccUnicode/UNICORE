import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, QueryFailedError, Repository } from 'typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { parseAreaId } from '../common/utils/parse-area-id.util';
import { Skill } from '../skills/skill.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { MemberResponse } from './dto/member-response.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './member.entity';
import { toMemberResponse } from './utils/member-response.util';

type DatabaseErrorWithCode = {
  code: string;
};

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
    @InjectRepository(Area)
    private readonly areasRepository: Repository<Area>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const { skills, areaId, status, ...restDto } = createMemberDto;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const resolvedSkills = await this.resolveSkills(skills);

    const member = this.membersRepository.create({
      ...restDto,
      ...(status !== undefined &&
        restDto.availabilityStatus === undefined && {
          availabilityStatus: status,
        }),
      role: restDto.role ?? AreaRole.MIEMBRO,
      skills: resolvedSkills,
      area:
        areaId !== undefined && areaId !== null ? { id: areaId } : undefined,
    });

    try {
      return await this.membersRepository.save(member);
    } catch (error) {
      const databaseError =
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError
          ? (error.driverError as DatabaseErrorWithCode)
          : null;

      if (databaseError?.code === '23505') {
        const duplicateMessage = createMemberDto.studentCode
          ? `A member with institution "${createMemberDto.institution}" and student code "${createMemberDto.studentCode}" already exists.`
          : `A member with institution "${createMemberDto.institution}" already exists.`;

        throw new ConflictException(duplicateMessage);
      }

      throw error;
    }
  }

  async update(id: number, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const { activityStatus, availabilityStatus, status, areaId } =
      updateMemberDto;
    const resolvedAvailabilityStatus = availabilityStatus ?? status;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const preloadData: DeepPartial<Member> = {
      id,
      ...(activityStatus !== undefined && { activityStatus }),
      ...(resolvedAvailabilityStatus !== undefined && {
        availabilityStatus: resolvedAvailabilityStatus,
      }),
      ...(areaId !== undefined && {
        area: areaId === null ? null : { id: areaId },
      }),
    };

    const member = await this.membersRepository.preload(preloadData);

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return this.membersRepository.save(member);
  }

  findAll(filterDto?: GetMembersFilterDto): Promise<Member[]> {
    const activityStatus = filterDto?.activityStatus;
    const availabilityStatus =
      filterDto?.availabilityStatus ?? filterDto?.status;
    const areaId = filterDto?.areaId;
    const skills = filterDto?.skills;

    const query = this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.skills', 'skill')
      .leftJoinAndSelect('member.area', 'area')
      .orderBy('member.lastNames', 'ASC')
      .addOrderBy('member.firstNames', 'ASC')
      .addOrderBy('member.createdAt', 'ASC');

    if (activityStatus) {
      query.andWhere('member.activityStatus = :activityStatus', {
        activityStatus,
      });
    }

    if (availabilityStatus) {
      query.andWhere('member.availabilityStatus = :availabilityStatus', {
        availabilityStatus,
      });
    }

    if (areaId !== undefined) {
      query.andWhere('area.id = :areaId', { areaId });
    }

    if (skills && skills.length > 0) {
      query
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('member_sub.id')
            .from(Member, 'member_sub')
            .innerJoin('member_sub.skills', 'skill_sub')
            .where('skill_sub.name IN (:...skills)')
            .getQuery();
          return `member.id IN ${subQuery}`;
        })
        .setParameter('skills', skills);
    }

    return query.getMany();
  }

  async findAccessible(
    accessActor: RequestAccessActor,
    filterDto?: GetMembersFilterDto,
  ): Promise<MemberResponse[]> {
    if (accessActor.role === AreaRole.PRESIDENCIA) {
      const members = await this.findAll(filterDto);

      return this.toAccessibleMemberResponses(members, accessActor);
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      const areaId = parseAreaId(accessActor.areaId);

      const members = await this.findAll({
        ...filterDto,
        areaId,
      });

      return this.toAccessibleMemberResponses(members, accessActor);
    }

    throw new ForbiddenException(
      'Project-scoped member access is not available on this endpoint yet',
    );
  }

  private toAccessibleMemberResponses(
    members: Member[],
    accessActor: RequestAccessActor,
  ): MemberResponse[] {
    return members.map((member) => toMemberResponse(member, accessActor.role));
  }

  private async resolveSkills(skillNames: string[]): Promise<Skill[]> {
    const uniqueSkillNames = [...new Set(skillNames)];

    const existingSkills = await this.skillsRepository.find({
      where: {
        name: In(uniqueSkillNames),
      },
    });

    const existingSkillNames = new Set(
      existingSkills.map((skill) => skill.name),
    );

    const newSkills = uniqueSkillNames
      .filter((name) => !existingSkillNames.has(name))
      .map((name) => this.skillsRepository.create({ name }));

    const savedNewSkills =
      newSkills.length > 0 ? await this.skillsRepository.save(newSkills) : [];

    return [...existingSkills, ...savedNewSkills];
  }

  private async validateAreaExists(areaId: number): Promise<void> {
    const areaExists = await this.areasRepository.exists({
      where: { id: areaId },
    });
    if (!areaExists) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }
  }
}
