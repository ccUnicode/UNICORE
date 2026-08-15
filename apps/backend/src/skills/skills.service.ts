import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './skill.entity';
import { isUniqueViolation } from '../common/utils/database-errors.util';
import {
  cleanText,
  normalizeText,
} from '../common/utils/text-normalization.util';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const name = cleanText(createSkillDto.name);
    const skill = this.skillsRepository.create({
      name,
      normalizedName: normalizeText(name),
    });

    try {
      return await this.skillsRepository.save(skill);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `A skill with name "${name}" already exists.`,
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
