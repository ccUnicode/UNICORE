import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  In,
  Repository,
} from 'typeorm';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import { parseAreaId } from '../common/utils/parse-area-id.util';
import {
  cleanText,
  normalizedSql,
  normalizeText,
} from '../common/utils/text-normalization.util';
import { Skill } from '../skills/skill.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { MemberResponse } from './dto/member-response.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberAvailabilityStatus } from './enums/member-availability-status.enum';
import { DisabledAccessSnapshot, Member } from './member.entity';
import { toMemberResponse } from './utils/member-response.util';
import { AuditService } from '../audit/audit.service';
import { MemberActivityService } from './member-activity.service';
import { MemberAvailabilityService } from './member-availability.service';

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
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly memberActivityService: MemberActivityService,
    private readonly memberAvailabilityService: MemberAvailabilityService,
  ) {}

  async create(
    createMemberDto: CreateMemberDto,
    entityManager?: EntityManager,
    accessActor?: RequestAccessActor,
  ): Promise<Member> {
    this.assertMemberCreationAccess(createMemberDto, accessActor);

    if (!entityManager) {
      return this.dataSource.transaction(async (em) =>
        this.create(createMemberDto, em, accessActor),
      );
    }
    const sanitizedDto = { ...createMemberDto } as CreateMemberDto & {
      status?: unknown;
      availabilityStatus?: unknown;
      activityStatus?: unknown;
    };
    delete sanitizedDto.status;
    delete sanitizedDto.availabilityStatus;
    delete sanitizedDto.activityStatus;
    const { skills, areaId, ...restDto } = sanitizedDto;
    const membersRepository = entityManager.getRepository(Member);
    const skillsRepository = entityManager.getRepository(Skill);
    const areasRepository = entityManager.getRepository(Area);
    const areaMembershipsRepository =
      entityManager.getRepository(AreaMembership);

    if (areaId !== undefined && areaId !== null) {
      await this.validateActiveAreaExists(areaId, areasRepository);
    }

    const resolvedSkills = await this.resolveSkills(skills, skillsRepository);

    const member = membersRepository.create({
      ...restDto,
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

      if (accessActor) {
        await this.auditService.record(
          accessActor,
          {
            action: 'create',
            entityType: 'Member',
            entityId: savedMember.id,
            areaId: areaId ?? null,
            metadata: {
              firstNames: savedMember.firstNames,
              lastNames: savedMember.lastNames,
            },
          },
          entityManager,
        );
      }

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

  async update(
    id: number,
    updateMemberDto: UpdateMemberDto,
    entityManager?: EntityManager,
    accessActor?: RequestAccessActor,
  ): Promise<Member> {
    if (!entityManager) {
      return this.dataSource.transaction(async (em) =>
        this.update(id, updateMemberDto, em, accessActor),
      );
    }
    const sanitizedDto = { ...updateMemberDto } as UpdateMemberDto & {
      status?: unknown;
      availabilityStatus?: unknown;
      activityStatus?: unknown;
    };
    delete sanitizedDto.status;
    delete sanitizedDto.availabilityStatus;
    delete sanitizedDto.activityStatus;
    const { areaId, cycle, skills, ...profileUpdates } = sanitizedDto;

    const membersRepository = entityManager.getRepository(Member);
    const skillsRepository = entityManager.getRepository(Skill);
    const areaMembershipsRepository =
      entityManager.getRepository(AreaMembership);
    const areasRepository = entityManager.getRepository(Area);

    if (areaId !== undefined && areaId !== null) {
      await this.validateActiveAreaExists(areaId, areasRepository);
    }

    const member = await membersRepository.findOne({
      where: { id },
      relations: ['memberships', 'projectMemberships'],
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    Object.assign(member, profileUpdates);

    if (skills !== undefined) {
      member.skills = await this.resolveSkills(skills, skillsRepository);
    }
    if (cycle !== undefined) {
      member.cycle = cycle === null ? null : cycle;
    }

    let savedMember: Member;
    try {
      savedMember = await membersRepository.save(member);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A member with the same institution and student code already exists.',
        );
      }

      throw error;
    }

    if (areaId !== undefined) {
      const roles = savedMember.memberships.map((m) => m.role);
      let targetRole: AreaRole | null = null;
      if (roles.includes(AreaRole.DIRECTIVA_DE_AREA)) {
        targetRole = AreaRole.DIRECTIVA_DE_AREA;
      } else if (roles.includes(AreaRole.MIEMBRO)) {
        targetRole = AreaRole.MIEMBRO;
      }

      const existingMembership = targetRole
        ? await areaMembershipsRepository.findOne({
            where: {
              member: { id },
              role: targetRole,
            },
            order: { id: 'ASC' },
          })
        : null;

      if (areaId === null) {
        if (existingMembership) {
          if (existingMembership.role === AreaRole.DIRECTIVA_DE_AREA) {
            await areaMembershipsRepository.remove(existingMembership);
          } else {
            existingMembership.area = null;
            await areaMembershipsRepository.save(existingMembership);
          }
        }
      } else {
        if (existingMembership) {
          existingMembership.area = { id: areaId } as Area;
          await areaMembershipsRepository.save(existingMembership);
        } else {
          const newMembership = areaMembershipsRepository.create({
            member: savedMember,
            area: { id: areaId },
            role: AreaRole.DIRECTIVA_DE_AREA,
          });
          await areaMembershipsRepository.save(newMembership);
        }
      }
    }

    // Load memberships relation to keep getters working
    savedMember.memberships = await areaMembershipsRepository.find({
      where: { member: { id } },
    });

    if (accessActor) {
      await this.auditService.record(
        accessActor,
        {
          action: 'update',
          entityType: 'Member',
          entityId: savedMember.id,
          areaId: areaId !== undefined ? areaId : (savedMember.areaId ?? null),
          metadata: {
            firstNames: savedMember.firstNames,
            lastNames: savedMember.lastNames,
          },
        },
        entityManager,
      );
    }

    return savedMember;
  }

  async deactivate(
    id: number,
    confirmName: string,
    accessActor: RequestAccessActor,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: ['memberships', 'projectMemberships'],
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

    member.availabilityStatus = MemberAvailabilityStatus.DISABLED;
    member.disabledAt = new Date();
    member.disabledAccessSnapshot = this.buildDisabledAccessSnapshot(
      member.role,
      member.areaId,
      (member.projectMemberships ?? []).map(({ projectId }) => projectId),
    );

    const savedMember = await this.membersRepository.save(member);

    await this.auditService.record(accessActor, {
      action: 'deactivate',
      entityType: 'Member',
      entityId: savedMember.id,
      areaId: savedMember.areaId ?? null,
      metadata: {
        firstNames: savedMember.firstNames,
        lastNames: savedMember.lastNames,
      },
    });

    return savedMember;
  }

  async reactivate(
    id: number,
    confirmName: string,
    accessActor: RequestAccessActor,
  ): Promise<Member> {
    return this.dataSource.transaction(async (entityManager) => {
      const membersRepository = entityManager.getRepository(Member);
      const member = await membersRepository.findOne({
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

      if (member.availabilityStatus !== MemberAvailabilityStatus.DISABLED) {
        throw new BadRequestException(
          'Only disabled members can be reactivated',
        );
      }

      member.availabilityStatus = MemberAvailabilityStatus.AVAILABLE;
      member.disabledAt = null;
      member.disabledAccessSnapshot = null;
      const savedMember = await membersRepository.save(member);
      await this.memberActivityService.refreshMembers([id], entityManager);
      await this.memberAvailabilityService.refreshMembers([id], entityManager);

      await this.auditService.record(
        accessActor,
        {
          action: 'reactivate',
          entityType: 'Member',
          entityId: savedMember.id,
          areaId: savedMember.areaId ?? null,
          metadata: {
            firstNames: savedMember.firstNames,
            lastNames: savedMember.lastNames,
          },
        },
        entityManager,
      );

      return (
        (await membersRepository.findOne({
          where: { id },
          relations: ['memberships'],
        })) ?? savedMember
      );
    });
  }

  private buildDisabledAccessSnapshot(
    role: AreaRole,
    areaId: number | null,
    projectIds: number[],
  ): DisabledAccessSnapshot {
    return {
      role,
      areaId,
      projectIds: [...new Set(projectIds)].sort((left, right) => left - right),
    };
  }

  findAll(
    filterDto?: GetMembersFilterDto,
    membershipSnapshotAt?: Date,
  ): Promise<Member[]> {
    const activityStatus = filterDto?.activityStatus;
    const availabilityStatus = filterDto?.availabilityStatus;
    const areaId = filterDto?.areaId;
    const cycle = filterDto?.cycle;
    const skills = filterDto?.skills;
    const search = filterDto?.search;
    const career = filterDto?.career;

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
      const membershipCutoff = membershipSnapshotAt
        ? ' AND areaMembershipFilter.createdAt <= :membershipSnapshotAt AND areaMembershipFilter.updatedAt <= :membershipSnapshotAt'
        : '';
      query.innerJoin(
        'member.memberships',
        'areaMembershipFilter',
        `areaMembershipFilter.areaId = :areaId${membershipCutoff}`,
        { areaId, ...(membershipSnapshotAt && { membershipSnapshotAt }) },
      );
    }

    if (cycle !== undefined) {
      query.andWhere('member.cycle = :cycle', { cycle });
    }

    if (career) {
      query.andWhere(`${normalizedSql('member.major')} = :career`, {
        career: normalizeText(career),
      });
    }

    if (search) {
      query.andWhere(
        `concat_ws(' ', ${normalizedSql('member.firstNames')}, ${normalizedSql('member.lastNames')}, ${normalizedSql('member.major')}, ${normalizedSql('area.name')}, ${normalizedSql('skill.name')}) LIKE :search`,
        { search: `%${normalizeText(search)}%` },
      );
    }

    if (skills && skills.length > 0) {
      query
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('member_sub.id')
            .from(Member, 'member_sub')
            .innerJoin('member_sub.skills', 'skill_sub')
            .where(`${normalizedSql('skill_sub.name')} IN (:...skills)`)
            .getQuery();
          return `member.id IN ${subQuery}`;
        })
        .setParameter('skills', skills.map(normalizeText));
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

      const members = await this.findAll(
        {
          ...filterDto,
          areaId,
        },
        accessActor.snapshotAt,
      );

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
    const skillNamesByNormalizedName = new Map<string, string>();
    skillNames.forEach((name) => {
      const cleanedName = cleanText(name);
      const normalizedName = normalizeText(cleanedName);
      if (normalizedName && !skillNamesByNormalizedName.has(normalizedName)) {
        skillNamesByNormalizedName.set(normalizedName, cleanedName);
      }
    });
    const normalizedNames = [...skillNamesByNormalizedName.keys()];

    const existingSkills = await skillsRepository.find({
      where: {
        normalizedName: In(normalizedNames),
      },
    });

    const existingSkillNames = new Set(
      existingSkills.map((skill) =>
        skill.normalizedName ? skill.normalizedName : normalizeText(skill.name),
      ),
    );

    const newSkills = normalizedNames
      .filter((name) => !existingSkillNames.has(name))
      .map((normalizedName) =>
        skillsRepository.create({
          name: skillNamesByNormalizedName.get(normalizedName),
          normalizedName,
        }),
      );

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

  private assertMemberCreationAccess(
    createMemberDto: CreateMemberDto,
    accessActor?: RequestAccessActor,
  ): void {
    if (!accessActor || accessActor.role === AreaRole.PRESIDENCIA) {
      return;
    }

    if (accessActor.role === AreaRole.DIRECTIVA_DE_AREA) {
      const actorAreaId = parseAreaId(accessActor.areaId);
      if (
        createMemberDto.areaId === actorAreaId &&
        createMemberDto.role === AreaRole.MIEMBRO
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      'Member creation is limited to regular members in your own area',
    );
  }
}
