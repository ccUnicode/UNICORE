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
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { CreateProjectPhaseDto } from './dto/create-project-phase.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { ReorderProjectPhasesDto } from './dto/reorder-project-phases.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectPhaseDto } from './dto/update-project-phase.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.create(createProjectDto, accessActor);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  findAll(
    @CurrentAccessActor() accessActor: RequestAccessActor,
    @Query() filterDto: GetProjectsFilterDto,
  ) {
    return this.projectsService.findAll(filterDto, accessActor);
  }

  @Get(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.findOne(id, accessActor);
  }

  @Patch(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.update(id, updateProjectDto, accessActor);
  }

  @Patch(':id/archive')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ) {
    return this.projectsService.archive(id, accessActor);
  }

  @Get(':projectId/phases')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA, AreaRole.MIEMBRO)
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
}
