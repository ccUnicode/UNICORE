import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './skill.entity';

type DatabaseErrorWithCode = {
  code: string;
};

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const skill = this.skillsRepository.create(createSkillDto);

    try {
      return await this.skillsRepository.save(skill);
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
          `A skill with name "${createSkillDto.name}" already exists.`,
        );
      }

      throw error;
    }
  }

  findAll(): Promise<Skill[]> {
    return this.skillsRepository.find({
      order: {
        name: 'ASC',
        createdAt: 'ASC',
      },
    });
  }
}