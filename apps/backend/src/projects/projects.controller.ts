import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessScope } from '../common/decorators/access-scope.decorator';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.projectsService.findAll(paginationDto);
  }

  @Get(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  @AccessScope({ projectIdParam: 'id' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.findOne(id, accessActor);
  }

  @Post(':id/members')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  addTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() addDto: AddProjectMemberDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.addTeamMember(id, addDto, accessActor);
  }

  @Patch(':id/members/:memberId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  updateTeamMemberRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() updateDto: UpdateProjectMemberDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.updateTeamMemberRole(
      id,
      memberId,
      updateDto,
      accessActor,
    );
  }

  @Delete(':id/members/:memberId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  removeTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.removeTeamMember(id, memberId, accessActor);
  }
}
