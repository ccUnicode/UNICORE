import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
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

  findAll(): Promise<Member[]> {
    return this.membersRepository.find({
      relations: {
        skills: true,
      },
      order: {
        lastNames: 'ASC',
        firstNames: 'ASC',
        createdAt: 'ASC',
      },
    });
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
}
