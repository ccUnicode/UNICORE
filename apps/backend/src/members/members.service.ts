import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './member.entity';
import { Skill } from '../skills/skill.entity';
import { Area } from '../area/entities/area.entity';

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
    const { skills, areaId, ...restDto } = createMemberDto;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const resolvedSkills = await this.resolveSkills(skills);

    const member = this.membersRepository.create({
      ...restDto,
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
    const { status, areaId } = updateMemberDto;

    if (areaId !== undefined && areaId !== null) {
      await this.validateAreaExists(areaId);
    }

    const preloadData: DeepPartial<Member> = {
      id,
      ...(status !== undefined && { status }),
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
    const status = filterDto?.status;
    const areaId = filterDto?.areaId;
    const skills = filterDto?.skills;

    const query = this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.skills', 'skill')
      .leftJoinAndSelect('member.area', 'area')
      .orderBy('member.lastNames', 'ASC')
      .addOrderBy('member.firstNames', 'ASC')
      .addOrderBy('member.createdAt', 'ASC');

    if (status) {
      query.andWhere('member.status = :status', { status });
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
