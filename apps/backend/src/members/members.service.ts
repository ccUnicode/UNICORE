import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Repository } from 'typeorm';
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
import { MemberActivityStatus } from './enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from './enums/member-availability-status.enum';
import { Member } from './member.entity';
import { toMemberResponse } from './utils/member-response.util';

interface LegacyCreateMemberInput extends CreateMemberDto {
  status?: MemberAvailabilityStatus;
}

interface LegacyUpdateMemberInput extends UpdateMemberDto {
  status?: MemberAvailabilityStatus;
}

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

  async create(
    createMemberDto: CreateMemberDto,
    entityManager?: EntityManager,
  ): Promise<Member> {
    const { skills, areaId, status, ...restDto } =
      createMemberDto as LegacyCreateMemberInput;
    const membersRepository =
      entityManager?.getRepository(Member) ?? this.membersRepository;
    const skillsRepository =
      entityManager?.getRepository(Skill) ?? this.skillsRepository;
    const areasRepository =
      entityManager?.getRepository(Area) ?? this.areasRepository;
    const areaMembershipsRepository =
      entityManager?.getRepository(AreaMembership) ??
      this.areaMembershipsRepository;

    const resolvedAvailabilityStatus = restDto.availabilityStatus ?? status;

    if (areaId !== undefined && areaId !== null) {
      await this.validateActiveAreaExists(areaId, areasRepository);
    }

    const resolvedSkills = await this.resolveSkills(skills, skillsRepository);

    const member = membersRepository.create({
      ...restDto,
      ...(resolvedAvailabilityStatus !== undefined && {
        availabilityStatus: resolvedAvailabilityStatus,
      }),
      skills: resolvedSkills,
    } as DeepPartial<Member>);

    try {
      const savedMember = await membersRepository.save(member);

      const membership = areaMembershipsRepository.create({
        member: savedMember,
        area: areaId !== undefined && areaId !== null ? { id: areaId } : null,
        role: createMemberDto.role ?? AreaRole.MIEMBRO,
      });
      await areaMembershipsRepository.save(membership);

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
    const { activityStatus, availabilityStatus, status, areaId, cycle } =
      updateMemberDto as LegacyUpdateMemberInput;
    const resolvedAvailabilityStatus = availabilityStatus ?? status;

    if (areaId !== undefined && areaId !== null) {
      await this.validateActiveAreaExists(areaId);
    }

    const member = await this.membersRepository.findOne({
      where: { id },
      relations: ['memberships'],
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (activityStatus !== undefined) {
      member.activityStatus = activityStatus;
    }
    if (resolvedAvailabilityStatus !== undefined) {
      member.availabilityStatus = resolvedAvailabilityStatus;
    }
    if (cycle !== undefined) {
      member.cycle = cycle === null ? null : cycle;
    }

    const savedMember = await this.membersRepository.save(member);

    if (areaId !== undefined) {
      const roles = savedMember.memberships.map((m) => m.role);
      let targetRole: AreaRole | null = null;
      if (roles.includes(AreaRole.DIRECTIVA_DE_AREA)) {
        targetRole = AreaRole.DIRECTIVA_DE_AREA;
      } else if (roles.includes(AreaRole.MIEMBRO)) {
        targetRole = AreaRole.MIEMBRO;
      }

      const existingMembership = targetRole
        ? await this.areaMembershipsRepository.findOne({
            where: {
              member: { id },
              role: targetRole,
            },
          })
        : null;

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

  async deactivate(
    id: number,
    confirmName: string,
    accessActor: RequestAccessActor,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: ['memberships'],
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    this.assertMemberDeactivationAccess(member, accessActor);

    const exactName = `${member.firstNames} ${member.lastNames}`;
    if (confirmName !== exactName) {
      throw new BadRequestException(
        'confirmName must exactly match the member full name',
      );
    }

    member.activityStatus = MemberActivityStatus.INACTIVE;
    member.availabilityStatus = MemberAvailabilityStatus.DISABLED;

    return this.membersRepository.save(member);
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

  private async resolveSkills(
    skillNames: string[],
    skillsRepository: Repository<Skill> = this.skillsRepository,
  ): Promise<Skill[]> {
    const uniqueSkillNames = [...new Set(skillNames)];

    const existingSkills = await skillsRepository.find({
      where: {
        name: In(uniqueSkillNames),
      },
    });

    const existingSkillNames = new Set(
      existingSkills.map((skill) => skill.name),
    );

    const newSkills = uniqueSkillNames
      .filter((name) => !existingSkillNames.has(name))
      .map((name) => skillsRepository.create({ name }));

    const savedNewSkills =
      newSkills.length > 0 ? await skillsRepository.save(newSkills) : [];

    return [...existingSkills, ...savedNewSkills];
  }

  private async validateActiveAreaExists(
    areaId: number,
    areasRepository: Repository<Area> = this.areasRepository,
  ): Promise<void> {
    const areaExists = await areasRepository.exists({
      where: { id: areaId, isArchived: false },
    });
    if (!areaExists) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }
  }

  private assertMemberDeactivationAccess(
    member: Member,
    accessActor: RequestAccessActor,
  ): void {
    if (accessActor.role === AreaRole.PRESIDENCIA) {
      return;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      const actorAreaId = parseAreaId(accessActor.areaId);
      const belongsToActorArea =
        member.areaId === actorAreaId ||
        member.memberships.some(
          (membership) => membership.areaId === actorAreaId,
        );

      if (belongsToActorArea) {
        return;
      }
    }

    throw new ForbiddenException(
      'Member deactivation is limited to members in your own area',
    );
  }
}
