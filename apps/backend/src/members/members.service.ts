import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { Member } from './member.entity';
import { Skill } from '../skills/skill.entity';

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
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const resolvedSkills = await this.resolveSkills(createMemberDto.skills);

    const member = this.membersRepository.create({
      ...createMemberDto,
      skills: resolvedSkills,
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

  findAll(filterDto?: GetMembersFilterDto): Promise<Member[]> {
    const status = filterDto?.status;
    const areaId = filterDto?.areaId;
    const skills = filterDto?.skills;

    const query = this.membersRepository.createQueryBuilder('member')
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
      query.andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select('member_sub.id')
          .from(Member, 'member_sub')
          .innerJoin('member_sub.skills', 'skill_sub')
          .where('skill_sub.name IN (:...skills)')
          .getQuery();
        return `member.id IN ${subQuery}`;
      }).setParameter('skills', skills);
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

    const existingSkillNames = new Set(existingSkills.map((skill) => skill.name));

    const newSkills = uniqueSkillNames
      .filter((name) => !existingSkillNames.has(name))
      .map((name) => this.skillsRepository.create({ name }));

    const savedNewSkills =
      newSkills.length > 0 ? await this.skillsRepository.save(newSkills) : [];

    return [...existingSkills, ...savedNewSkills];
  }
}