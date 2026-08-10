import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './skill.entity';
import { SkillsService } from './skills.service';

@Controller('skills')
@UseGuards(RolesGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(@Body() createSkillDto: CreateSkillDto): Promise<Skill> {
    return this.skillsService.create(createSkillDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  findAll(): Promise<Skill[]> {
    return this.skillsService.findAll();
  }
}
