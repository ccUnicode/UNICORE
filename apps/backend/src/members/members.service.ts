import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import { parseAreaId } from '../common/utils/parse-area-id.util';
import { Skill } from '../skills/skill.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { MemberResponse } from './dto/member-response.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './member.entity';
import { toMemberResponse } from './utils/member-response.util';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
    @InjectRepository(Area)
    private readonly areasRepository: Repository<Area>,
    @InjectRepository(AreaMembership)
    private readonly areaMembershipsRepository: Repository<AreaMembership>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const { skills, areaId, ...restDto } = createMemberDto;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const resolvedSkills = await this.resolveSkills(skills);

    const member = this.membersRepository.create({
      ...restDto,
      skills: resolvedSkills,
    });

    try {
      const savedMember = await this.membersRepository.save(member);

      const membership = this.areaMembershipsRepository.create({
        member: savedMember,
        area: areaId !== undefined && areaId !== null ? { id: areaId } : null,
        role: createMemberDto.role ?? AreaRole.MIEMBRO,
      });
      await this.areaMembershipsRepository.save(membership);

      savedMember.memberships = [membership];
      return savedMember;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const duplicateMessage = createMemberDto.studentCode
          ? `A member with institution "${createMemberDto.institution}" and student code "${createMemberDto.studentCode}" already exists.`
          : `A member with institution "${createMemberDto.institution}" already exists.`;

        throw new ConflictException(duplicateMessage);
      }

      throw error;
    }
  }

  async update(id: number, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const { activityStatus, availabilityStatus, areaId, cycle } =
      updateMemberDto;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const preloadData: DeepPartial<Member> = {
      id,
      ...(activityStatus !== undefined && { activityStatus }),
      ...(availabilityStatus !== undefined && { availabilityStatus }),
      ...(cycle !== undefined && { cycle: cycle === null ? null : cycle }),
    };

    const member = await this.membersRepository.preload(preloadData);

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    const savedMember = await this.membersRepository.save(member);

    if (areaId !== undefined) {
      const existingMembership = await this.areaMembershipsRepository.findOne({
        where: {
          member: { id },
          role: savedMember.role,
        },
      });

      if (areaId === null) {
        if (existingMembership) {
          if (existingMembership.role === AreaRole.DIRECTIVA_DE_AREA) {
            await this.areaMembershipsRepository.remove(existingMembership);
          } else {
            existingMembership.area = null;
            await this.areaMembershipsRepository.save(existingMembership);
          }
        }
      } else {
        if (existingMembership) {
          existingMembership.area = { id: areaId } as Area;
          await this.areaMembershipsRepository.save(existingMembership);
        } else {
          const newMembership = this.areaMembershipsRepository.create({
            member: savedMember,
            area: { id: areaId },
            role: AreaRole.DIRECTIVA_DE_AREA,
          });
          await this.areaMembershipsRepository.save(newMembership);
        }
      }
    }

    // Load memberships relation to keep getters working
    savedMember.memberships = await this.areaMembershipsRepository.find({
      where: { member: { id } },
    });

    return savedMember;
  }

  findAll(filterDto?: GetMembersFilterDto): Promise<Member[]> {
    const activityStatus = filterDto?.activityStatus;
    const availabilityStatus = filterDto?.availabilityStatus;
    const areaId = filterDto?.areaId;
    const cycle = filterDto?.cycle;
    const skills = filterDto?.skills;

    const query = this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.skills', 'skill')
      .leftJoinAndSelect('member.memberships', 'membership')
      .leftJoinAndSelect('membership.area', 'area')
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

    if (cycle !== undefined) {
      query.andWhere('member.cycle = :cycle', { cycle });
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
