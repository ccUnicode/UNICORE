import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './skill.entity';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  create(@Body() createSkillDto: CreateSkillDto): Promise<Skill> {
    return this.skillsService.create(createSkillDto);
  }

  @Get()
  findAll(): Promise<Skill[]> {
    return this.skillsService.findAll();
    }
}
