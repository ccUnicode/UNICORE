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
import { PaginationDto } from '../common/dto/pagination.dto';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
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

  @Get(':projectId/phases')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  @AccessScope({ projectIdParam: 'projectId' })
  findPhases(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.findPhases(projectId, accessActor);
  }

  @Post(':projectId/phases')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  createPhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createProjectPhaseDto: CreateProjectPhaseDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.createPhase(
      projectId,
      createProjectPhaseDto,
      accessActor,
    );
  }

  @Patch(':projectId/phases/reorder')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  reorderPhases(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() reorderProjectPhasesDto: ReorderProjectPhasesDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.reorderPhases(
      projectId,
      reorderProjectPhasesDto,
      accessActor,
    );
  }

  @Patch(':projectId/phases/:phaseId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  updatePhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() updateProjectPhaseDto: UpdateProjectPhaseDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.updatePhase(
      projectId,
      phaseId,
      updateProjectPhaseDto,
      accessActor,
    );
  }

  @Delete(':projectId/phases/:phaseId')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  deletePhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.deletePhase(projectId, phaseId, accessActor);
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
